package com.bankledger.transaction.service;

import com.bankledger.transaction.client.AccountClient;
import com.bankledger.transaction.client.LedgerClient;
import com.bankledger.transaction.client.dto.LedgerTransactionRequest;
import com.bankledger.transaction.client.dto.LedgerTransactionResponse;
import com.bankledger.transaction.dto.TransactionResponse;
import com.bankledger.transaction.model.Transaction;
import com.bankledger.transaction.model.TransactionStatus;
import com.bankledger.transaction.model.TransactionType;
import com.bankledger.transaction.repository.TransactionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class RechargeServiceImpl implements RechargeService {

    @Autowired
    private AccountClient accountClient;

    @Autowired
    private LedgerClient ledgerClient;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private RewardService rewardService;

    private static final UUID UTILITY_PROVIDER_ACCOUNT_ID = UUID.nameUUIDFromBytes("utility_service_provider".getBytes());

    @Override
    @Transactional
    public TransactionResponse processRecharge(String username, UUID accountId, String phoneNumber, String operator, BigDecimal amount, String pin) {
        log.info("Processing recharge: user={}, accountId={}, operator={}, amount={}", username, accountId, operator, amount);

        // 1. Verify Transaction PIN
        if (pin == null || pin.trim().isEmpty()) {
            return TransactionResponse.builder()
                    .status("FAILED")
                    .errorMessage("Transaction failed: Transaction PIN is required.")
                    .amount(amount)
                    .currency("INR")
                    .transactionType("TRANSFER")
                    .build();
        }
        boolean pinValid = accountClient.verifyTransactionPin(username, pin);
        if (!pinValid) {
            return TransactionResponse.builder()
                    .status("FAILED")
                    .errorMessage("Transaction failed: Invalid Transaction PIN.")
                    .amount(amount)
                    .currency("INR")
                    .transactionType("TRANSFER")
                    .build();
        }

        // 2. Validate KYC status
        Map accountDetails = accountClient.getAccountDetails(accountId);
        if (accountDetails == null) {
            return TransactionResponse.builder()
                    .status("FAILED")
                    .errorMessage("KYC verification must be completed before using financial services.")
                    .amount(amount)
                    .currency("INR")
                    .transactionType("TRANSFER")
                    .build();
        }
        String kycStatus = accountDetails.get("kycStatus") != null ? accountDetails.get("kycStatus").toString() : "NOT_STARTED";
        if (!"APPROVED".equals(kycStatus)) {
            return TransactionResponse.builder()
                    .status("FAILED")
                    .errorMessage("KYC verification must be completed before using financial services.")
                    .amount(amount)
                    .currency("INR")
                    .transactionType("TRANSFER")
                    .build();
        }

        // 3. Create PENDING Transaction
        UUID txId = UUID.randomUUID();
        String idempotencyKey = "RECHARGE_" + txId.toString();
        String dynamicCategory = "RECHARGE_" + operator.toUpperCase() + "_" + phoneNumber;

        Transaction transaction = Transaction.builder()
                .id(txId)
                .sourceAccountId(accountId)
                .targetAccountId(UTILITY_PROVIDER_ACCOUNT_ID)
                .amount(amount)
                .currency("INR")
                .transactionType(TransactionType.TRANSFER)
                .status(TransactionStatus.PENDING)
                .idempotencyKey(idempotencyKey)
                .category(dynamicCategory)
                .build();

        transactionRepository.save(transaction);

        // 4. Submit to Ledger
        LedgerTransactionRequest ledgerRequest = LedgerTransactionRequest.builder()
                .transactionId(txId)
                .sourceAccountId(accountId)
                .targetAccountId(UTILITY_PROVIDER_ACCOUNT_ID)
                .amount(amount)
                .currency("INR")
                .idempotencyKey(idempotencyKey)
                .type("TRANSFER")
                .category(dynamicCategory)
                .build();

        LedgerTransactionResponse ledgerResponse = ledgerClient.processTransaction(ledgerRequest);

        if ("SUCCESS".equals(ledgerResponse.getStatus())) {
            // Simulated delay for telecom network provider
            try {
                Thread.sleep(1500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            // Generate operator reference
            String operatorRef = "OP-" + operator.toUpperCase() + "-" + String.format("%06d", (int)(Math.random() * 1000000));

            transaction.setStatus(TransactionStatus.COMPLETED);
            transactionRepository.save(transaction);

            // Trigger Cashback Rewards Rule Engine Hook
            try {
                rewardService.processTransactionCashback(
                    accountId,
                    txId,
                    "TRANSFER",
                    amount.doubleValue(),
                    dynamicCategory
                );
            } catch (Exception ex) {
                log.error("Failed to process recharge rewards/cashback", ex);
            }

            // Create notification for the user
            try {
                notificationService.createNotification(
                        accountId,
                        "Recharge Successful",
                        "Your " + operator + " recharge of ₹" + amount.setScale(2) + " for +91 " + phoneNumber + " was completed successfully. Ref: " + operatorRef
                );
            } catch (Exception e) {
                log.error("Failed to send recharge success notification", e);
            }

            return TransactionResponse.builder()
                    .status("SUCCESS")
                    .id(txId)
                    .amount(amount)
                    .currency("INR")
                    .transactionType("TRANSFER")
                    .build();
        } else {
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setErrorMessage(ledgerResponse.getMessage());
            transactionRepository.save(transaction);

            return TransactionResponse.builder()
                    .status("FAILED")
                    .errorMessage(ledgerResponse.getMessage() != null ? ledgerResponse.getMessage() : "Insufficient balance or ledger error.")
                    .amount(amount)
                    .currency("INR")
                    .transactionType("TRANSFER")
                    .build();
        }
    }
}
