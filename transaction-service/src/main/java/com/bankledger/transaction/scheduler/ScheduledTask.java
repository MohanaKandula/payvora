package com.bankledger.transaction.scheduler;

import com.bankledger.transaction.dto.TransactionRequest;
import com.bankledger.transaction.dto.TransactionResponse;
import com.bankledger.transaction.model.ScheduledPayment;
import com.bankledger.transaction.model.InvestmentSettings;
import com.bankledger.transaction.repository.ScheduledPaymentRepository;
import com.bankledger.transaction.repository.TransactionRepository;
import com.bankledger.transaction.repository.InvestmentSettingsRepository;
import com.bankledger.transaction.service.TransactionService;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Component
@EnableScheduling
@Slf4j
public class ScheduledTask {

    @Autowired
    private ScheduledPaymentRepository scheduledPaymentRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private InvestmentSettingsRepository investmentSettingsRepository;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${balance-service.url:http://localhost:8084}")
    private String balanceServiceUrl;

    // Run every 60 seconds to execute scheduled payments
    @Scheduled(fixedDelay = 60000)
    public void executeScheduledPayments() {
        log.info("Cron: Checking for pending scheduled payments...");
        List<ScheduledPayment> pending = scheduledPaymentRepository.findByStatusAndNextRunAtBefore("Scheduled", LocalDateTime.now());
        
        for (ScheduledPayment payment : pending) {
            log.info("Cron: Executing scheduled payment: id={}, amount={}, type={}", 
                    payment.getId(), payment.getAmount(), payment.getPaymentType());
            try {
                // Set status to Processing
                payment.setStatus("Processing");
                scheduledPaymentRepository.saveAndFlush(payment);

                if (!"TRANSFER".equals(payment.getPaymentType())) {
                    throw new IllegalArgumentException("Only bank transfers are supported in the Scheduled Transfers module.");
                }

                TransactionRequest txReq = new TransactionRequest();
                txReq.setSourceAccountId(payment.getSourceAccountId());
                txReq.setTargetAccountId(payment.getTargetAccountId());
                txReq.setAmount(payment.getAmount());
                txReq.setCurrency(payment.getCurrency());
                txReq.setCategory(payment.getCategory());
                txReq.setIdempotencyKey(UUID.randomUUID().toString()); // fresh key for execution
                
                TransactionResponse response = transactionService.transfer(txReq);

                if ("COMPLETED".equals(response.getStatus()) || "SUCCESS".equals(response.getStatus())) {
                    payment.setStatus("Completed");
                    payment.setLastRunAt(LocalDateTime.now());
                    scheduledPaymentRepository.save(payment);
                    log.info("Cron: Scheduled transfer executed successfully: id={}", payment.getId());
                } else {
                    payment.setStatus("Failed");
                    String err = response.getErrorMessage() != null ? response.getErrorMessage() : "Ledger rejection";
                    payment.setNotes(payment.getNotes() != null ? payment.getNotes() + " (Failed: " + err + ")" : "Failed: " + err);
                    scheduledPaymentRepository.save(payment);
                    log.error("Cron: Scheduled transfer execution failed: {}", err);
                }
            } catch (Exception e) {
                payment.setStatus("Failed");
                String err = e.getMessage() != null ? e.getMessage() : "Unknown exception";
                payment.setNotes(payment.getNotes() != null ? payment.getNotes() + " (Error: " + err + ")" : "Error: " + err);
                scheduledPaymentRepository.save(payment);
                log.error("Cron: Error executing scheduled payment " + payment.getId(), e);
            }
        }
    }

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
            log.error("Failed to write APY audit log", e);
        }
    }

    // Run nightly at midnight to accrue interest (4.5% APY yield)
    @Scheduled(cron = "0 0 0 * * *")
    public void accrueInterestDaily() {
        log.info("Cron: Starting daily APY interest accrual calculation...");
        try {
            accrueInterestInternal();
        } catch (Exception e) {
            log.error("Cron: Error during daily interest accrual", e);
        }
    }

    public void accrueInterestInternal() {
        if (com.bankledger.transaction.controller.TreasuryController.isReconciliationFailed()) {
            log.warn("Cron: Treasury is in a CRITICAL/Imbalanced state. Aborting APY savings interest accrual.");
            return;
        }

        List<UUID> accountIds = transactionRepository.findDistinctSourceAccountIds();
        log.info("Cron: Found {} accounts to evaluate for daily APY interest accrual", accountIds.size());
        
        BigDecimal totalInterestObligation = BigDecimal.ZERO;
        java.util.Map<UUID, BigDecimal> computedInterests = new java.util.HashMap<>();
        java.util.Map<UUID, BalanceDto> accountBalances = new java.util.HashMap<>();

        // 1. Pre-calculate total obligation
        for (UUID accountId : accountIds) {
            try {
                String url = balanceServiceUrl + "/api/balances/" + accountId;
                BalanceDto balance = restTemplate.getForObject(url, BalanceDto.class);
                if (balance != null && balance.getCurrentBalance() != null) {
                    BigDecimal currentBalance = balance.getCurrentBalance();
                    if (currentBalance.compareTo(BigDecimal.ZERO) > 0) {
                        InvestmentSettings settings = investmentSettingsRepository.findById("GLOBAL")
                                .orElseThrow(() -> new IllegalStateException("Treasury Configuration Missing: APY settings must be configured by Administrator in Treasury Settings."));
                        BigDecimal apyRate = settings.getApyRate();
                        if (apyRate == null || apyRate.compareTo(BigDecimal.ZERO) <= 0) {
                            log.error("Cron: Configured APY rate is invalid: {}", apyRate);
                            continue;
                        }
                        BigDecimal dailyRate = apyRate.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP)
                                .divide(new BigDecimal("365"), 10, RoundingMode.HALF_UP);
                        BigDecimal dailyInterest = currentBalance.multiply(dailyRate).setScale(4, RoundingMode.HALF_UP);

                        if (dailyInterest.compareTo(new BigDecimal("0.0001")) > 0) {
                            totalInterestObligation = totalInterestObligation.add(dailyInterest);
                            computedInterests.put(accountId, dailyInterest);
                            accountBalances.put(accountId, balance);
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Cron: Failed to pre-calculate interest for account " + accountId, e);
            }
        }

        // 2. Fetch Yield Reserve balance
        UUID yieldReserveId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c603");
        BigDecimal yieldReserveBalance = BigDecimal.ZERO;
        try {
            String url = balanceServiceUrl + "/api/balances/" + yieldReserveId;
            BalanceDto balance = restTemplate.getForObject(url, BalanceDto.class);
            if (balance != null && balance.getCurrentBalance() != null) {
                yieldReserveBalance = balance.getCurrentBalance();
            }
        } catch (Exception e) {
            log.error("Cron: Failed to fetch Yield Reserve balance", e);
        }

        // 3. Verify funding and pause if insufficient
        if (yieldReserveBalance.compareTo(totalInterestObligation) < 0) {
            log.warn("Cron: Yield reserve is insufficient to cover accrued interest obligation of {}. Skipping interest accrual.", totalInterestObligation);
            writeAuditLog("APY_ACCRUAL_FAILED", UUID.randomUUID(), yieldReserveId, yieldReserveBalance, "FAILED", 
                    "Yield reserve insufficient. APY interest distribution paused. Required: " + totalInterestObligation + ", Available: " + yieldReserveBalance);
            return;
        }

        // 4. Distribute if sufficient
        for (java.util.Map.Entry<UUID, BigDecimal> entry : computedInterests.entrySet()) {
            UUID accountId = entry.getKey();
            BigDecimal dailyInterest = entry.getValue();
            BalanceDto balance = accountBalances.get(accountId);
            try {
                // Post as a TRANSFER transaction to the account from the Yield Reserve
                TransactionRequest txReq = new TransactionRequest();
                txReq.setSourceAccountId(yieldReserveId);
                txReq.setTargetAccountId(accountId);
                txReq.setAmount(dailyInterest);
                txReq.setCurrency(balance.getCurrency() != null ? balance.getCurrency() : "USD");
                txReq.setCategory("YIELD_CREDIT");
                txReq.setIdempotencyKey("APY-INTEREST-" + accountId + "-" + java.time.LocalDate.now());

                TransactionResponse response = transactionService.transfer(txReq);
                log.info("Cron: APY Interest Deposit completed for account {}, status={}", accountId, response.getStatus());
            } catch (Exception e) {
                log.error("Cron: Failed to accrue interest for account " + accountId, e);
            }
        }
    }

    @Data
    public static class BalanceDto {
        private UUID accountId;
        private BigDecimal currentBalance;
        private String currency;
    }
}
