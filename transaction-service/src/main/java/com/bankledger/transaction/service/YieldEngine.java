package com.bankledger.transaction.service;

import com.bankledger.transaction.client.LedgerClient;
import com.bankledger.transaction.client.dto.LedgerTransactionRequest;
import com.bankledger.transaction.client.dto.LedgerTransactionResponse;
import com.bankledger.transaction.model.InvestmentAccount;
import com.bankledger.transaction.model.InvestmentSettings;
import com.bankledger.transaction.model.InvestmentTransaction;
import com.bankledger.transaction.model.YieldAccrual;
import com.bankledger.transaction.repository.InvestmentAccountRepository;
import com.bankledger.transaction.repository.InvestmentSettingsRepository;
import com.bankledger.transaction.repository.InvestmentTransactionRepository;
import com.bankledger.transaction.repository.YieldAccrualRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class YieldEngine {

    @Autowired
    private InvestmentAccountRepository investmentAccountRepository;

    @Autowired
    private InvestmentTransactionRepository investmentTransactionRepository;

    @Autowired
    private YieldAccrualRepository yieldAccrualRepository;

    @Autowired
    private InvestmentSettingsRepository investmentSettingsRepository;

    @Autowired
    private LedgerClient ledgerClient;

    @Autowired
    private com.bankledger.transaction.repository.TreasuryAuditLogRepository treasuryAuditLogRepository;

    private void writeAuditLog(String actionType, UUID referenceId, UUID walletId, BigDecimal balance, String status, String reason) {
        try {
            com.bankledger.transaction.model.TreasuryAuditLog auditLog = com.bankledger.transaction.model.TreasuryAuditLog.builder()
                    .id(UUID.randomUUID())
                    .adminUser("SYSTEM")
                    .actionType(actionType)
                    .referenceId(referenceId)
                    .walletId(walletId)
                    .beforeBalance(balance)
                    .afterBalance(balance)
                    .status(status)
                    .ipAddress("127.0.0.1")
                    .deviceInfo("Yield Engine System Check")
                    .reason(reason)
                    .createdAt(LocalDateTime.now())
                    .build();
            treasuryAuditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to write yield audit log", e);
        }
    }

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void accrueDailyYield() {
        log.info("[Yield Engine] Starting daily yield accrual job...");
        executeYieldAccrualFlow();
    }

    @Transactional
    public void runManually() {
        log.info("[Yield Engine] Manually triggering yield accrual job...");
        executeYieldAccrualFlow();
    }

    @Transactional
    public void accrueYieldForUser(UUID accountId) {
        log.info("[Yield Engine] Accruing yield on logout for account: {}", accountId);
        if (com.bankledger.transaction.controller.TreasuryController.isReconciliationFailed()) {
            log.warn("[Yield Engine] Treasury is in a CRITICAL/Imbalanced state. Aborting vault yield interest accrual.");
            return;
        }

        InvestmentSettings settings = investmentSettingsRepository.findById("GLOBAL")
                .orElseThrow(() -> new IllegalStateException("Treasury Configuration Missing: APY settings must be configured by Administrator before executing Yield Engine."));

        if (settings.isYieldEnginePaused()) {
            log.warn("[Yield Engine] Yield accrual is paused by admin. Skipping run.");
            return;
        }

        InvestmentAccount account = investmentAccountRepository.findById(accountId).orElse(null);
        if (account == null || !"ACTIVE".equals(account.getStatus())) {
            log.warn("[Yield Engine] No active investment account found for {}", accountId);
            return;
        }

        BigDecimal principal = account.getInvestedBalance();
        if (principal.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        BigDecimal userApy = settings.getApyRate();
        if (userApy == null || userApy.compareTo(BigDecimal.ZERO) <= 0) {
            log.error("[Yield Engine] Configured User APY rate is invalid: {}", userApy);
            return;
        }

        BigDecimal grossApy = settings.getGrossApyRate() != null ? settings.getGrossApyRate() : userApy.add(BigDecimal.valueOf(1.00));
        BigDecimal spreadApy = settings.getPlatformSpread() != null ? settings.getPlatformSpread() : grossApy.subtract(userApy);

        BigDecimal grossRate = grossApy.divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP)
                                       .divide(BigDecimal.valueOf(365), 8, RoundingMode.HALF_UP);
        BigDecimal userRate = userApy.divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP)
                                     .divide(BigDecimal.valueOf(365), 8, RoundingMode.HALF_UP);
        BigDecimal spreadRate = spreadApy.divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP)
                                         .divide(BigDecimal.valueOf(365), 8, RoundingMode.HALF_UP);

        BigDecimal grossYield = principal.multiply(grossRate).setScale(4, RoundingMode.HALF_UP);
        BigDecimal userYield = principal.multiply(userRate).setScale(4, RoundingMode.HALF_UP);
        BigDecimal spreadRevenue = principal.multiply(spreadRate).setScale(4, RoundingMode.HALF_UP);

        if (userYield.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        UUID portfolioWalletId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c607");
        UUID yieldReserveWalletId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c603");
        UUID platformRevenueWalletId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c602");

        BigDecimal yieldReserveBalance = ledgerClient.getWalletBalance(yieldReserveWalletId);
        if (yieldReserveBalance.compareTo(userYield) < 0) {
            log.warn("[Yield Engine] Yield reserve is insufficient to cover accrued interest obligation of {}.", userYield);
            return;
        }

        LocalDate today = LocalDate.now();
        String idempotencySuffix = "LOGOUT_" + LocalDateTime.now().getHour() + "_" + LocalDateTime.now().getMinute();

        // Phase 1: Portfolio Earnings -> Yield Reserve Wallet
        LedgerTransactionRequest earningsReq = LedgerTransactionRequest.builder()
                .transactionId(UUID.randomUUID())
                .sourceAccountId(portfolioWalletId)
                .targetAccountId(yieldReserveWalletId)
                .amount(grossYield)
                .currency("USD")
                .idempotencyKey("PORTFOLIO_EARNINGS_" + account.getId() + "_" + today + "_" + idempotencySuffix)
                .type("TRANSFER")
                .category("PORTFOLIO_EARNINGS")
                .build();

        LedgerTransactionResponse earningsRes = ledgerClient.processTransaction(earningsReq);
        if (!"SUCCESS".equals(earningsRes.getStatus())) {
            log.error("[Yield Engine] Portfolio earnings ledger credit failed: {}", earningsRes.getMessage());
            return;
        }

        // Phase 2: Yield Reserve Wallet -> User Compounding Account
        UUID vaultLedgerAccountId = UUID.nameUUIDFromBytes((account.getId().toString() + "_vault").getBytes());
        LedgerTransactionRequest userReq = LedgerTransactionRequest.builder()
                .transactionId(UUID.randomUUID())
                .sourceAccountId(yieldReserveWalletId)
                .targetAccountId(vaultLedgerAccountId)
                .amount(userYield)
                .currency("USD")
                .idempotencyKey("YIELD_USER_" + account.getId() + "_" + today + "_" + idempotencySuffix)
                .type("TRANSFER")
                .category("YIELD_CREDIT")
                .build();

        LedgerTransactionResponse userRes = ledgerClient.processTransaction(userReq);
        if (!"SUCCESS".equals(userRes.getStatus())) {
            log.error("[Yield Engine] User yield ledger credit failed: {}", userRes.getMessage());
            return;
        }

        // Phase 3: Yield Reserve Wallet -> Platform Revenue Wallet
        if (spreadRevenue.compareTo(BigDecimal.ZERO) > 0) {
            LedgerTransactionRequest revenueReq = LedgerTransactionRequest.builder()
                    .transactionId(UUID.randomUUID())
                    .sourceAccountId(yieldReserveWalletId)
                    .targetAccountId(platformRevenueWalletId)
                    .amount(spreadRevenue)
                    .currency("USD")
                    .idempotencyKey("YIELD_SPREAD_" + account.getId() + "_" + today + "_" + idempotencySuffix)
                    .type("TRANSFER")
                    .category("PLATFORM_REVENUE")
                    .build();

            LedgerTransactionResponse revenueRes = ledgerClient.processTransaction(revenueReq);
            if (!"SUCCESS".equals(revenueRes.getStatus())) {
                log.error("[Yield Engine] Platform revenue ledger credit failed: {}", revenueRes.getMessage());
            }
        }

        // Save YieldAccrual for internal tracking
        YieldAccrual accrual = YieldAccrual.builder()
                .id(UUID.randomUUID())
                .investmentId(account.getId())
                .principalAmount(principal)
                .dailyRate(userRate)
                .yieldAmount(userYield)
                .accrualDate(today)
                .build();
        yieldAccrualRepository.save(accrual);

        // Update user investment balance
        account.setInvestedBalance(account.getInvestedBalance().add(userYield));
        account.setTotalYieldEarned(account.getTotalYieldEarned().add(userYield));
        account.setUpdatedAt(LocalDateTime.now());
        investmentAccountRepository.save(account);

        InvestmentTransaction tx = InvestmentTransaction.builder()
                .id(UUID.randomUUID())
                .investmentId(account.getId())
                .type("YIELD_CREDIT")
                .amount(userYield)
                .description("Interest yield credit triggered by logout")
                .createdAt(LocalDateTime.now())
                .build();
        investmentTransactionRepository.save(tx);

        log.info("[Yield Engine] Yield accrual successfully processed on logout for user account: {}", account.getId());
    }

    private void executeYieldAccrualFlow() {
        if (com.bankledger.transaction.controller.TreasuryController.isReconciliationFailed()) {
            log.warn("[Yield Engine] Treasury is in a CRITICAL/Imbalanced state. Aborting vault yield interest accrual.");
            return;
        }

        InvestmentSettings settings = investmentSettingsRepository.findById("GLOBAL")
                .orElseThrow(() -> new IllegalStateException("Treasury Configuration Missing: APY settings must be configured by Administrator before executing Yield Engine."));

        if (settings.isYieldEnginePaused()) {
            log.warn("[Yield Engine] Yield accrual is paused by admin. Skipping run.");
            return;
        }

        List<InvestmentAccount> activeInvestments = investmentAccountRepository.findByStatus("ACTIVE");
        log.info("[Yield Engine] Found {} active investment accounts for daily interest credit.", activeInvestments.size());

        BigDecimal userApy = settings.getApyRate();
        if (userApy == null || userApy.compareTo(BigDecimal.ZERO) <= 0) {
            log.error("[Yield Engine] Configured User APY rate is invalid: {}", userApy);
            return;
        }

        BigDecimal grossApy = settings.getGrossApyRate() != null ? settings.getGrossApyRate() : userApy.add(BigDecimal.valueOf(1.00));
        BigDecimal spreadApy = settings.getPlatformSpread() != null ? settings.getPlatformSpread() : grossApy.subtract(userApy);

        BigDecimal grossRate = grossApy.divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP)
                                       .divide(BigDecimal.valueOf(365), 8, RoundingMode.HALF_UP);
        BigDecimal userRate = userApy.divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP)
                                     .divide(BigDecimal.valueOf(365), 8, RoundingMode.HALF_UP);
        BigDecimal spreadRate = spreadApy.divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP)
                                         .divide(BigDecimal.valueOf(365), 8, RoundingMode.HALF_UP);

        LocalDate today = LocalDate.now();
        UUID portfolioWalletId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c607");
        UUID yieldReserveWalletId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c603");
        UUID platformRevenueWalletId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c602");

        // Pre-calculate total user yield obligation
        BigDecimal totalUserYieldObligation = BigDecimal.ZERO;
        for (InvestmentAccount account : activeInvestments) {
            BigDecimal principal = account.getInvestedBalance();
            if (principal.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BigDecimal userYield = principal.multiply(userRate).setScale(4, RoundingMode.HALF_UP);
            if (userYield.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            totalUserYieldObligation = totalUserYieldObligation.add(userYield);
        }

        BigDecimal yieldReserveBalance = ledgerClient.getWalletBalance(yieldReserveWalletId);
        if (yieldReserveBalance.compareTo(totalUserYieldObligation) < 0) {
            log.warn("[Yield Engine] Yield reserve is insufficient to cover accrued interest obligation of {}. Skipping yield accrual.", totalUserYieldObligation);
            writeAuditLog("YIELD_ACCRUAL_FAILED", UUID.randomUUID(), yieldReserveWalletId, yieldReserveBalance, "FAILED", 
                    "Yield reserve insufficient. Vault interest distribution paused. Required: " + totalUserYieldObligation + ", Available: " + yieldReserveBalance);
            return;
        }

        for (InvestmentAccount account : activeInvestments) {
            BigDecimal principal = account.getInvestedBalance();
            if (principal.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            BigDecimal grossYield = principal.multiply(grossRate).setScale(4, RoundingMode.HALF_UP);
            BigDecimal userYield = principal.multiply(userRate).setScale(4, RoundingMode.HALF_UP);
            BigDecimal spreadRevenue = principal.multiply(spreadRate).setScale(4, RoundingMode.HALF_UP);

            if (userYield.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            log.info("[Yield Engine] Accruing yield for account {}: principal={}, grossYield={}, userYield={}, spread={}", 
                    account.getId(), principal, grossYield, userYield, spreadRevenue);

            // Phase 1: Portfolio Earnings -> Yield Reserve Wallet
            LedgerTransactionRequest earningsReq = LedgerTransactionRequest.builder()
                    .transactionId(UUID.randomUUID())
                    .sourceAccountId(portfolioWalletId)
                    .targetAccountId(yieldReserveWalletId)
                    .amount(grossYield)
                    .currency("USD")
                    .idempotencyKey("PORTFOLIO_EARNINGS_" + account.getId() + "_" + today)
                    .type("TRANSFER")
                    .category("PORTFOLIO_EARNINGS")
                    .build();

            LedgerTransactionResponse earningsRes = ledgerClient.processTransaction(earningsReq);
            if (!"SUCCESS".equals(earningsRes.getStatus())) {
                log.error("[Yield Engine] Portfolio earnings ledger credit failed: {}", earningsRes.getMessage());
                continue;
            }

            // Phase 2: Yield Reserve Wallet -> User Compounding Account
            UUID vaultLedgerAccountId = UUID.nameUUIDFromBytes((account.getId().toString() + "_vault").getBytes());
            LedgerTransactionRequest userReq = LedgerTransactionRequest.builder()
                    .transactionId(UUID.randomUUID())
                    .sourceAccountId(yieldReserveWalletId)
                    .targetAccountId(vaultLedgerAccountId)
                    .amount(userYield)
                    .currency("USD")
                    .idempotencyKey("YIELD_USER_" + account.getId() + "_" + today)
                    .type("TRANSFER")
                    .category("YIELD_CREDIT")
                    .build();

            LedgerTransactionResponse userRes = ledgerClient.processTransaction(userReq);
            if (!"SUCCESS".equals(userRes.getStatus())) {
                log.error("[Yield Engine] User yield ledger credit failed: {}", userRes.getMessage());
                continue;
            }

            // Phase 3: Yield Reserve Wallet -> Platform Revenue Wallet
            if (spreadRevenue.compareTo(BigDecimal.ZERO) > 0) {
                LedgerTransactionRequest revenueReq = LedgerTransactionRequest.builder()
                        .transactionId(UUID.randomUUID())
                        .sourceAccountId(yieldReserveWalletId)
                        .targetAccountId(platformRevenueWalletId)
                        .amount(spreadRevenue)
                        .currency("USD")
                        .idempotencyKey("YIELD_SPREAD_" + account.getId() + "_" + today)
                        .type("TRANSFER")
                        .category("PLATFORM_REVENUE")
                        .build();

                LedgerTransactionResponse revenueRes = ledgerClient.processTransaction(revenueReq);
                if (!"SUCCESS".equals(revenueRes.getStatus())) {
                    log.error("[Yield Engine] Platform revenue ledger credit failed: {}", revenueRes.getMessage());
                }
            }

            // Save YieldAccrual for internal tracking
            YieldAccrual accrual = YieldAccrual.builder()
                    .id(UUID.randomUUID())
                    .investmentId(account.getId())
                    .principalAmount(principal)
                    .dailyRate(userRate)
                    .yieldAmount(userYield)
                    .accrualDate(today)
                    .build();
            yieldAccrualRepository.save(accrual);

            // Update user investment balance
            account.setInvestedBalance(account.getInvestedBalance().add(userYield));
            account.setTotalYieldEarned(account.getTotalYieldEarned().add(userYield));
            account.setUpdatedAt(LocalDateTime.now());
            investmentAccountRepository.save(account);

            InvestmentTransaction tx = InvestmentTransaction.builder()
                    .id(UUID.randomUUID())
                    .investmentId(account.getId())
                    .type("YIELD_CREDIT")
                    .amount(userYield)
                    .description("Daily interest yield credit at APY " + userApy + "%")
                    .createdAt(LocalDateTime.now())
                    .build();
            investmentTransactionRepository.save(tx);
            
            log.info("[Yield Engine] Yield accrual successfully processed for user account: {}", account.getId());
        }
    }
}
