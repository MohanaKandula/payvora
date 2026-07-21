package com.bankledger.transaction.service;

import com.bankledger.transaction.client.AccountClient;
import com.bankledger.transaction.client.LedgerClient;
import com.bankledger.transaction.client.dto.LedgerTransactionRequest;
import com.bankledger.transaction.client.dto.LedgerTransactionResponse;
import com.bankledger.transaction.dto.TransactionResponse;
import com.bankledger.transaction.model.InvestmentAccount;
import com.bankledger.transaction.model.InvestmentSettings;
import com.bankledger.transaction.model.InvestmentTransaction;
import com.bankledger.transaction.repository.InvestmentAccountRepository;
import com.bankledger.transaction.repository.InvestmentOrderRepository;
import com.bankledger.transaction.repository.InvestmentSettingsRepository;
import com.bankledger.transaction.repository.InvestmentTransactionRepository;
import com.bankledger.transaction.repository.YieldAccrualRepository;
import com.bankledger.transaction.model.InvestmentOrder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class InvestmentServiceImpl implements InvestmentService {

    @Autowired
    private InvestmentAccountRepository investmentAccountRepository;

    @Autowired
    private InvestmentTransactionRepository investmentTransactionRepository;

    @Autowired
    private YieldAccrualRepository yieldAccrualRepository;

    @Autowired
    private InvestmentSettingsRepository investmentSettingsRepository;

    @Autowired
    private InvestmentOrderRepository investmentOrderRepository;

    @Autowired
    private LedgerClient ledgerClient;

    @Autowired
    private AccountClient accountClient;

    @Autowired
    private com.bankledger.transaction.repository.TreasuryAuditLogRepository treasuryAuditLogRepository;

    @Override
    @Transactional
    public InvestmentAccount getOrCreateInvestmentAccount(UUID accountId) {
        return investmentAccountRepository.findById(accountId)
                .orElseGet(() -> {
                    BigDecimal currentApy = getGlobalApy();
                    InvestmentAccount newAccount = InvestmentAccount.builder()
                            .id(accountId)
                            .userId(accountId)
                            .investedBalance(BigDecimal.ZERO.setScale(4))
                            .totalYieldEarned(BigDecimal.ZERO.setScale(4))
                            .apyRate(currentApy)
                            .status("ACTIVE")
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return investmentAccountRepository.save(newAccount);
                });
    }

    @Override
    @Transactional
    public TransactionResponse deposit(String username, UUID accountId, BigDecimal amount, String pin) {
        log.info("[Investment Service] Request to invest amount={} for user={}, account={}", amount, username, accountId);

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return failResponse(amount, "Investment amount must be positive.");
        }

        // 1. Verify User Profile Security Requirements
        Map accountDetails = accountClient.getAccountDetails(accountId);
        if (accountDetails == null) {
            return failResponse(amount, "Security Check: Account details not found. Complete profile registration.");
        }

        String kycStatus = accountDetails.get("kycStatus") != null ? accountDetails.get("kycStatus").toString() : "";
        if (!"APPROVED".equals(kycStatus)) {
            return failResponse(amount, "Security Check Failed: KYC approval is required before investing.");
        }

        Boolean mfaEnabled = (Boolean) accountDetails.get("mfaEnabled");
        if (mfaEnabled == null || !mfaEnabled) {
            return failResponse(amount, "Security Check Failed: Multi-Factor Authentication (MFA) must be active to protect investments.");
        }

        String accountStatus = accountDetails.get("status") != null ? accountDetails.get("status").toString() : "";
        if (!"ACTIVE".equals(accountStatus)) {
            return failResponse(amount, "Security Check Failed: A verified active bank account is required.");
        }

        // 2. Validate Transaction PIN
        boolean pinValid = accountClient.verifyTransactionPin(username, pin);
        if (!pinValid) {
            return failResponse(amount, "Authentication Failed: Invalid 4-digit transaction PIN.");
        }

        // 3. Double-Entry Ledger Call
        UUID vaultLedgerAccountId = UUID.nameUUIDFromBytes((accountId.toString() + "_vault").getBytes());
        UUID txId = UUID.randomUUID();

        LedgerTransactionRequest ledgerRequest = LedgerTransactionRequest.builder()
                .transactionId(txId)
                .sourceAccountId(accountId) // debit spendable wallet balance
                .targetAccountId(vaultLedgerAccountId) // credit vault ledger account
                .amount(amount)
                .currency("INR")
                .idempotencyKey("INVEST_DEP_" + txId)
                .type("TRANSFER")
                .category("INVESTMENT_DEPOSIT")
                .build();

        log.info("[Investment Service] Submitting ledger debit transfer: spendable wallet -> locked vault");
        LedgerTransactionResponse ledgerResponse = ledgerClient.processTransaction(ledgerRequest);

        if (!"SUCCESS".equals(ledgerResponse.getStatus())) {
            return failResponse(amount, "Transfer Rejected: " + ledgerResponse.getMessage());
        }

        // 4. Update Vault Account State
        InvestmentAccount account = getOrCreateInvestmentAccount(accountId);
        account.setInvestedBalance(account.getInvestedBalance().add(amount));
        account.setUpdatedAt(LocalDateTime.now());
        investmentAccountRepository.save(account);

        // 5. Record Investment Transaction Log
        InvestmentTransaction txLog = InvestmentTransaction.builder()
                .id(UUID.randomUUID())
                .investmentId(accountId)
                .type("INVESTMENT_DEPOSIT")
                .amount(amount)
                .description("Invested funds deposit from wallet balance")
                .createdAt(LocalDateTime.now())
                .build();
        investmentTransactionRepository.save(txLog);

        return TransactionResponse.builder()
                .status("SUCCESS")
                .id(txId)
                .amount(amount)
                .currency("INR")
                .category("INVESTMENT_DEPOSIT")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Override
    @Transactional
    public TransactionResponse withdraw(String username, UUID accountId, BigDecimal amount, String pin) {
        log.info("[Investment Service] Request to withdraw invested amount={} for user={}, account={}", amount, username, accountId);

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return failResponse(amount, "Withdrawal amount must be positive.");
        }

        // 1. Validate Transaction PIN
        boolean pinValid = accountClient.verifyTransactionPin(username, pin);
        if (!pinValid) {
            return failResponse(amount, "Authentication Failed: Invalid 4-digit transaction PIN.");
        }

        // 2. Validate Vault Balance
        InvestmentAccount account = investmentAccountRepository.findById(accountId).orElse(null);
        if (account == null || account.getInvestedBalance().compareTo(amount) < 0) {
            return failResponse(amount, "Withdrawal Rejected: Insufficient balance in Investment Vault.");
        }

        // 3. Double-Entry Ledger Call
        UUID vaultLedgerAccountId = UUID.nameUUIDFromBytes((accountId.toString() + "_vault").getBytes());
        UUID txId = UUID.randomUUID();

        LedgerTransactionRequest ledgerRequest = LedgerTransactionRequest.builder()
                .transactionId(txId)
                .sourceAccountId(vaultLedgerAccountId) // debit vault ledger account
                .targetAccountId(accountId) // credit spendable wallet balance
                .amount(amount)
                .currency("INR")
                .idempotencyKey("INVEST_WITH_" + txId)
                .type("TRANSFER")
                .category("INVESTMENT_WITHDRAWAL")
                .build();

        log.info("[Investment Service] Submitting ledger credit transfer: locked vault -> spendable wallet");
        LedgerTransactionResponse ledgerResponse = ledgerClient.processTransaction(ledgerRequest);

        if (!"SUCCESS".equals(ledgerResponse.getStatus())) {
            return failResponse(amount, "Transfer Rejected: " + ledgerResponse.getMessage());
        }

        // 4. Update Vault Account State
        account.setInvestedBalance(account.getInvestedBalance().subtract(amount));
        account.setUpdatedAt(LocalDateTime.now());
        investmentAccountRepository.save(account);

        // 5. Record Investment Transaction Log
        InvestmentTransaction txLog = InvestmentTransaction.builder()
                .id(UUID.randomUUID())
                .investmentId(accountId)
                .type("INVESTMENT_WITHDRAWAL")
                .amount(amount)
                .description("Withdrew invested funds back to wallet balance")
                .createdAt(LocalDateTime.now())
                .build();
        investmentTransactionRepository.save(txLog);

        return TransactionResponse.builder()
                .status("SUCCESS")
                .id(txId)
                .amount(amount)
                .currency("INR")
                .category("INVESTMENT_WITHDRAWAL")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Override
    public List<InvestmentTransaction> getHistory(UUID accountId) {
        return investmentTransactionRepository.findByInvestmentIdOrderByCreatedAtDesc(accountId);
    }

    @Override
    public Map<String, Object> getAdminStats() {
        List<InvestmentAccount> accounts = investmentAccountRepository.findAll();
        BigDecimal totalAum = accounts.stream()
                .map(InvestmentAccount::getInvestedBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalYieldDistributed = accounts.stream()
                .map(InvestmentAccount::getTotalYieldEarned)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        InvestmentSettings settings = getSettings();
        BigDecimal grossApy = settings.getGrossApyRate() != null ? settings.getGrossApyRate() : settings.getApyRate().add(BigDecimal.valueOf(1.00));
        BigDecimal platformSpread = settings.getPlatformSpread() != null ? settings.getPlatformSpread() : grossApy.subtract(settings.getApyRate());

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalAum", totalAum);
        stats.put("totalYieldDistributed", totalYieldDistributed);
        stats.put("accountsCount", accounts.size());
        stats.put("apyRate", settings.getApyRate());
        stats.put("grossApyRate", grossApy);
        stats.put("platformSpread", platformSpread);
        stats.put("effectiveFrom", settings.getEffectiveFrom());
        stats.put("updatedBy", settings.getUpdatedBy() != null ? settings.getUpdatedBy() : "ADMIN");
        stats.put("updatedAt", settings.getUpdatedAt());
        stats.put("yieldEnginePaused", settings.isYieldEnginePaused());
        stats.put("recentReports", yieldAccrualRepository.findTop50ByOrderByAccrualDateDesc());
        
        return stats;
    }

    @Override
    @Transactional
    public void updateApy(BigDecimal apyRate) {
        InvestmentSettings settings = getSettings();
        BigDecimal oldApy = settings.getApyRate();
        BigDecimal grossApy = apyRate.add(BigDecimal.valueOf(1.00));
        BigDecimal spread = grossApy.subtract(apyRate);

        settings.setApyRate(apyRate);
        settings.setGrossApyRate(grossApy);
        settings.setPlatformSpread(spread);
        settings.setEffectiveFrom(LocalDateTime.now());
        settings.setUpdatedBy("ADMIN");
        settings.setUpdatedAt(LocalDateTime.now());
        investmentSettingsRepository.save(settings);
        
        // Update all active accounts to use the new APY for future accruals
        List<InvestmentAccount> accounts = investmentAccountRepository.findAll();
        for (InvestmentAccount acc : accounts) {
            acc.setApyRate(apyRate);
            acc.setUpdatedAt(LocalDateTime.now());
        }
        investmentAccountRepository.saveAll(accounts);

        // Record immutable Treasury Audit Log for APY rate update
        try {
            com.bankledger.transaction.model.TreasuryAuditLog auditLog = com.bankledger.transaction.model.TreasuryAuditLog.builder()
                    .id(UUID.randomUUID())
                    .adminUser("ADMIN")
                    .actionType("APY_UPDATE")
                    .referenceId(UUID.nameUUIDFromBytes("GLOBAL_SETTINGS".getBytes()))
                    .walletId(UUID.nameUUIDFromBytes("GLOBAL_SETTINGS".getBytes()))
                    .beforeBalance(oldApy)
                    .afterBalance(apyRate)
                    .status("COMPLETED")
                    .ipAddress("127.0.0.1")
                    .deviceInfo("Treasury Governance Console")
                    .reason("Administrator updated Treasury User APY from " + oldApy + "% to " + apyRate + "% (Gross APY: " + grossApy + "%, Spread: " + spread + "%)")
                    .createdAt(LocalDateTime.now())
                    .build();
            treasuryAuditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to write APY update audit log", e);
        }

        log.info("[Investment Service] Successfully updated global User APY from {}% to {}%", oldApy, apyRate);
    }

    @Override
    @Transactional
    public void togglePause(boolean paused) {
        InvestmentSettings settings = getSettings();
        settings.setYieldEnginePaused(paused);
        settings.setUpdatedAt(LocalDateTime.now());
        investmentSettingsRepository.save(settings);
        log.info("[Investment Service] Successfully toggled Yield Engine pause state to: {}", paused);
    }

    private InvestmentSettings getSettings() {
        return investmentSettingsRepository.findById("GLOBAL")
                .orElseGet(() -> {
                    BigDecimal defaultUserApy = BigDecimal.valueOf(4.50);
                    BigDecimal defaultGrossApy = BigDecimal.valueOf(5.50);
                    BigDecimal defaultSpread = BigDecimal.valueOf(1.00);
                    InvestmentSettings defaultSettings = InvestmentSettings.builder()
                            .id("GLOBAL")
                            .apyRate(defaultUserApy)
                            .grossApyRate(defaultGrossApy)
                            .platformSpread(defaultSpread)
                            .yieldEnginePaused(false)
                            .effectiveFrom(LocalDateTime.now())
                            .updatedBy("SYSTEM_INIT")
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return investmentSettingsRepository.save(defaultSettings);
                });
    }

    private BigDecimal getGlobalApy() {
        return getSettings().getApyRate();
    }

    private TransactionResponse failResponse(BigDecimal amount, String errorMsg) {
        return TransactionResponse.builder()
                .status("FAILED")
                .errorMessage(errorMsg)
                .amount(amount)
                .build();
    }

    @Override
    public Map<String, Object> getVaultAnalytics(UUID accountId) {
        InvestmentAccount account = getOrCreateInvestmentAccount(accountId);
        List<InvestmentTransaction> transactions = investmentTransactionRepository.findByInvestmentIdOrderByCreatedAtDesc(accountId);
        
        BigDecimal totalContributions = BigDecimal.ZERO;
        BigDecimal totalWithdrawals = BigDecimal.ZERO;
        BigDecimal todayYield = BigDecimal.ZERO;
        BigDecimal monthlyYield = BigDecimal.ZERO;
        
        LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        
        for (InvestmentTransaction tx : transactions) {
            if ("INVESTMENT_DEPOSIT".equals(tx.getType())) {
                totalContributions = totalContributions.add(tx.getAmount());
            } else if ("INVESTMENT_WITHDRAWAL".equals(tx.getType())) {
                totalWithdrawals = totalWithdrawals.add(tx.getAmount());
            } else if ("YIELD_CREDIT".equals(tx.getType())) {
                if (tx.getCreatedAt().isAfter(oneDayAgo)) {
                    todayYield = todayYield.add(tx.getAmount());
                }
                if (tx.getCreatedAt().isAfter(thirtyDaysAgo)) {
                    monthlyYield = monthlyYield.add(tx.getAmount());
                }
            }
        }
        
        long daysInvested = java.time.temporal.ChronoUnit.DAYS.between(account.getCreatedAt(), LocalDateTime.now());
        if (daysInvested <= 0) {
            daysInvested = 1;
        }
        
        Map<String, Object> analytics = new HashMap<>();
        analytics.put("totalContributions", totalContributions);
        analytics.put("totalWithdrawals", totalWithdrawals);
        analytics.put("netProfit", account.getTotalYieldEarned());
        analytics.put("annualizedReturn", account.getApyRate());
        analytics.put("totalYieldEarned", account.getTotalYieldEarned());
        analytics.put("todayYield", todayYield);
        analytics.put("monthlyYield", monthlyYield);
        analytics.put("currentInvestedBalance", account.getInvestedBalance());
        analytics.put("daysInvested", daysInvested);
        
        return analytics;
    }

    @Override
    public Map<String, Object> getTreasuryAllocation() {
        List<InvestmentOrder> activeOrders = investmentOrderRepository.findByStatus("ACTIVE");
        
        BigDecimal totalPrincipal = BigDecimal.ZERO;
        BigDecimal tbillsPrincipal = BigDecimal.ZERO;
        BigDecimal bondsPrincipal = BigDecimal.ZERO;
        BigDecimal mmfPrincipal = BigDecimal.ZERO;
        BigDecimal reservePrincipal = BigDecimal.ZERO;
        
        for (InvestmentOrder order : activeOrders) {
            totalPrincipal = totalPrincipal.add(order.getPrincipal());
            if ("TREASURY_BILLS".equals(order.getAssetType())) {
                tbillsPrincipal = tbillsPrincipal.add(order.getPrincipal());
            } else if ("CORPORATE_BONDS".equals(order.getAssetType())) {
                bondsPrincipal = bondsPrincipal.add(order.getPrincipal());
            } else if ("MONEY_MARKET_FUNDS".equals(order.getAssetType())) {
                mmfPrincipal = mmfPrincipal.add(order.getPrincipal());
            } else if ("CASH_RESERVE".equals(order.getAssetType())) {
                reservePrincipal = reservePrincipal.add(order.getPrincipal());
            }
        }
        
        BigDecimal pctTbills = BigDecimal.valueOf(70.0);
        BigDecimal pctBonds = BigDecimal.valueOf(15.0);
        BigDecimal pctMmf = BigDecimal.valueOf(10.0);
        BigDecimal pctReserve = BigDecimal.valueOf(5.0);
        
        if (totalPrincipal.compareTo(BigDecimal.ZERO) > 0) {
            pctTbills = tbillsPrincipal.multiply(BigDecimal.valueOf(100.0)).divide(totalPrincipal, 2, java.math.RoundingMode.HALF_UP);
            pctBonds = bondsPrincipal.multiply(BigDecimal.valueOf(100.0)).divide(totalPrincipal, 2, java.math.RoundingMode.HALF_UP);
            pctMmf = mmfPrincipal.multiply(BigDecimal.valueOf(100.0)).divide(totalPrincipal, 2, java.math.RoundingMode.HALF_UP);
            pctReserve = reservePrincipal.multiply(BigDecimal.valueOf(100.0)).divide(totalPrincipal, 2, java.math.RoundingMode.HALF_UP);
        }
        
        Map<String, Object> allocation = new HashMap<>();
        allocation.put("TREASURY_BILLS", pctTbills);
        allocation.put("CORPORATE_BONDS", pctBonds);
        allocation.put("MONEY_MARKET_FUNDS", pctMmf);
        allocation.put("CASH_RESERVE", pctReserve);
        allocation.put("totalPrincipal", totalPrincipal);
        
        return allocation;
    }

    @Override
    @Transactional
    public void updateVaultStatus(String adminUser, java.util.UUID accountId, String newStatus, String reason) {
        InvestmentAccount account = getOrCreateInvestmentAccount(accountId);
        String oldStatus = account.getStatus();
        account.setStatus(newStatus);
        account.setUpdatedAt(java.time.LocalDateTime.now());
        investmentAccountRepository.save(account);

        String actionType = "VAULT_RESUME";
        if ("FROZEN".equals(newStatus)) {
            actionType = "VAULT_FREEZE";
        } else if ("PAUSED".equals(newStatus)) {
            actionType = "VAULT_PAUSE";
        }

        try {
            com.bankledger.transaction.model.TreasuryAuditLog auditLog = com.bankledger.transaction.model.TreasuryAuditLog.builder()
                    .id(java.util.UUID.randomUUID())
                    .adminUser(adminUser != null ? adminUser : "ADMIN")
                    .actionType(actionType)
                    .referenceId(accountId)
                    .walletId(accountId)
                    .beforeBalance(account.getInvestedBalance())
                    .afterBalance(account.getInvestedBalance())
                    .status("COMPLETED")
                    .ipAddress("127.0.0.1")
                    .deviceInfo("Admin Vault Control Panel")
                    .reason(reason != null ? reason : "Administrative vault state update from " + oldStatus + " to " + newStatus)
                    .createdAt(java.time.LocalDateTime.now())
                    .build();
            treasuryAuditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to write vault status audit log", e);
        }
    }

    public List<InvestmentAccount> getOrCreateVaultAccountsList() {
        return investmentAccountRepository.findAll();
    }
}
