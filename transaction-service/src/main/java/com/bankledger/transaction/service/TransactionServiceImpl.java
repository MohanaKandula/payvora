package com.bankledger.transaction.service;

import com.bankledger.transaction.client.LedgerClient;
import com.bankledger.transaction.client.dto.LedgerTransactionRequest;
import com.bankledger.transaction.client.dto.LedgerTransactionResponse;
import com.bankledger.transaction.dto.TransactionRequest;
import com.bankledger.transaction.dto.TransactionResponse;
import com.bankledger.transaction.model.Transaction;
import com.bankledger.transaction.model.TransactionStatus;
import com.bankledger.transaction.model.TransactionType;
import com.bankledger.transaction.repository.TransactionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class TransactionServiceImpl implements TransactionService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private LedgerClient ledgerClient;

    @Autowired
    private com.bankledger.transaction.repository.AccountLimitRepository accountLimitRepository;

    @Autowired
    private com.bankledger.transaction.client.AccountClient accountClient;

    @Autowired
    private com.bankledger.transaction.repository.ChatMessageRepository chatMessageRepository;

    @Autowired
    private RewardService rewardService;

    @Autowired
    private NotificationService notificationService;

    @Override
    @Transactional
    public TransactionResponse deposit(TransactionRequest request) {
        return process(request, TransactionType.DEPOSIT);
    }

    @Override
    @Transactional
    public TransactionResponse withdraw(TransactionRequest request) {
        return process(request, TransactionType.WITHDRAWAL);
    }

    @Override
    @Transactional
    public TransactionResponse transfer(TransactionRequest request) {
        return process(request, TransactionType.TRANSFER);
    }

    private TransactionResponse process(TransactionRequest request, TransactionType type) {
        log.info("Processing public transaction request: type={}, key={}", type, request.getIdempotencyKey());

        // 1. Check Idempotency Table
        Optional<Transaction> existingOpt = transactionRepository.findByIdempotencyKey(request.getIdempotencyKey());
        if (existingOpt.isPresent()) {
            Transaction existing = existingOpt.get();
            log.info("Idempotent duplicate request detected for key {}. Returning existing transaction {}.", 
                    request.getIdempotencyKey(), existing.getId());
            return mapToResponse(existing);
        }

        // --- Resolve Phone Transfer Recipient & Gate Recipient KYC ---
        if (type == TransactionType.TRANSFER && request.getTargetAccountId() == null) {
            if (request.getPhoneNumber() != null && !request.getPhoneNumber().trim().isEmpty()) {
                java.util.Map targetAcc = accountClient.getAccountByPhoneNumber(request.getPhoneNumber().trim());
                if (targetAcc == null || !targetAcc.containsKey("id") || targetAcc.get("id") == null) {
                    return TransactionResponse.builder()
                            .status("FAILED")
                            .errorMessage("Transaction failed: Recipient phone number not found.")
                            .amount(request.getAmount())
                            .currency(request.getCurrency())
                            .transactionType(type.name())
                            .build();
                }
                
                String targetKyc = targetAcc.get("kycStatus") != null ? targetAcc.get("kycStatus").toString() : "NOT_STARTED";
                if (!"APPROVED".equals(targetKyc)) {
                    return TransactionResponse.builder()
                            .status("FAILED")
                            .errorMessage("Transaction failed: Recipient has not completed KYC verification.")
                            .amount(request.getAmount())
                            .currency(request.getCurrency())
                            .transactionType(type.name())
                            .build();
                }
                
                request.setTargetAccountId(UUID.fromString(targetAcc.get("id").toString()));
            } else {
                return TransactionResponse.builder()
                        .status("FAILED")
                        .errorMessage("Transaction failed: Recipient Account ID or Phone Number is required.")
                        .amount(request.getAmount())
                        .currency(request.getCurrency())
                        .transactionType(type.name())
                        .build();
            }
        } else if (type == TransactionType.TRANSFER && request.getTargetAccountId() != null) {
            String targetKyc = accountClient.getKycStatus(request.getTargetAccountId());
            if (!"APPROVED".equals(targetKyc)) {
                return TransactionResponse.builder()
                        .status("FAILED")
                        .errorMessage("Transaction failed: Recipient has not completed KYC verification.")
                        .amount(request.getAmount())
                        .currency(request.getCurrency())
                        .transactionType(type.name())
                        .build();
            }
        }

        // --- Security & Profile Verification Checks ---
        if (type == TransactionType.TRANSFER || type == TransactionType.WITHDRAWAL) {
            java.util.UUID sourceId = request.getSourceAccountId();
            if (sourceId != null && !isSystemWallet(sourceId)) {
                java.util.Map accountDetails = accountClient.getAccountDetails(sourceId);
                if (accountDetails == null) {
                    return TransactionResponse.builder()
                            .status("FAILED")
                            .errorMessage("KYC verification must be completed before using financial services.")
                            .amount(request.getAmount())
                            .currency(request.getCurrency())
                            .transactionType(type.name())
                            .build();
                }

                // 1. Check KYC Status
                String kycStatus = accountDetails.get("kycStatus") != null ? accountDetails.get("kycStatus").toString() : "NOT_STARTED";
                if (!"APPROVED".equals(kycStatus)) {
                    return TransactionResponse.builder()
                            .status("FAILED")
                            .errorMessage("KYC verification must be completed before using financial services.")
                            .amount(request.getAmount())
                            .currency(request.getCurrency())
                            .transactionType(type.name())
                            .build();
                }

                // 2. Check MFA Status
                Boolean mfaEnabled = (Boolean) accountDetails.get("mfaEnabled");
                if (mfaEnabled == null || !mfaEnabled) {
                    return TransactionResponse.builder()
                            .status("FAILED")
                            .errorMessage("KYC verification must be completed before using financial services.")
                            .amount(request.getAmount())
                            .currency(request.getCurrency())
                            .transactionType(type.name())
                            .build();
                }

                // 3. Check Profile Completion (Personal info: fullName, email, phoneNumber)
                String fullName = (String) accountDetails.get("fullName");
                String email = (String) accountDetails.get("email");
                String phoneNumber = (String) accountDetails.get("phoneNumber");
                if (fullName == null || fullName.trim().isEmpty() ||
                    email == null || email.trim().isEmpty() ||
                    phoneNumber == null || phoneNumber.trim().isEmpty()) {
                    return TransactionResponse.builder()
                            .status("FAILED")
                            .errorMessage("KYC verification must be completed before using financial services.")
                            .amount(request.getAmount())
                            .currency(request.getCurrency())
                            .transactionType(type.name())
                            .build();
                }

                // 4. Check Bank Account Verification Status
                String status = accountDetails.get("status") != null ? accountDetails.get("status").toString() : "";
                if (!"ACTIVE".equals(status)) {
                    return TransactionResponse.builder()
                            .status("FAILED")
                            .errorMessage("KYC verification must be completed before using financial services.")
                            .amount(request.getAmount())
                            .currency(request.getCurrency())
                            .transactionType(type.name())
                            .build();
                }
            }
        } else if (type == TransactionType.DEPOSIT) {
            if (request.getTargetAccountId() != null) {
                String kycStatus = accountClient.getKycStatus(request.getTargetAccountId());
                if (!"APPROVED".equals(kycStatus)) {
                    log.warn("Transaction blocked: target account {} KYC is not APPROVED (status: {})", 
                            request.getTargetAccountId(), kycStatus);
                    return TransactionResponse.builder()
                            .status("FAILED")
                            .errorMessage("Transaction blocked: KYC approval is required to make cash deposits.")
                            .amount(request.getAmount())
                            .currency(request.getCurrency())
                            .transactionType(type.name())
                            .build();
                }
            }
        }

        // --- Transaction PIN Guard ---
        if (request.getRequestUsername() != null) {
            if (request.getPin() == null || request.getPin().trim().isEmpty()) {
                log.warn("Transaction PIN required for user: {}", request.getRequestUsername());
                return TransactionResponse.builder()
                        .status("FAILED")
                        .errorMessage("Transaction failed: Transaction PIN is required.")
                        .amount(request.getAmount())
                        .currency(request.getCurrency())
                        .transactionType(type.name())
                        .build();
            }
            boolean pinValid = accountClient.verifyTransactionPin(request.getRequestUsername(), request.getPin());
            if (!pinValid) {
                log.warn("Invalid Transaction PIN provided by user: {}", request.getRequestUsername());
                return TransactionResponse.builder()
                        .status("FAILED")
                        .errorMessage("Transaction failed: Invalid Transaction PIN.")
                        .amount(request.getAmount())
                        .currency(request.getCurrency())
                        .transactionType(type.name())
                        .build();
            }
        }

        // --- MFA Security Check for High-Value Transfers ---
        if (type == TransactionType.TRANSFER && request.getAmount().compareTo(new java.math.BigDecimal("1000.00")) >= 0) {
            if (request.getRequestUsername() != null) {
                if (request.getMfaCode() == null || request.getMfaCode().trim().isEmpty()) {
                    log.warn("MFA code required for high-value transfer: amount={}", request.getAmount());
                    return TransactionResponse.builder()
                            .status("FAILED")
                            .errorMessage("MFA_REQUIRED")
                            .amount(request.getAmount())
                            .currency(request.getCurrency())
                            .transactionType(type.name())
                            .build();
                } else {
                    boolean mfaValid = accountClient.verifyTransferMfa(request.getRequestUsername(), request.getMfaCode());
                    if (!mfaValid) {
                        log.warn("Invalid MFA code provided for transfer by user {}", request.getRequestUsername());
                        return TransactionResponse.builder()
                                .status("FAILED")
                                .errorMessage("Invalid MFA verification code")
                                .amount(request.getAmount())
                                .currency(request.getCurrency())
                                .transactionType(type.name())
                                .build();
                    }
                }
            }
        }

        // Determine category (default to "OTHERS" if not specified)
        String category = request.getCategory() == null || request.getCategory().trim().isEmpty()
                ? "OTHERS"
                : request.getCategory().toUpperCase();

        // --- Enforce Account Spending Limits ---
        if (type == TransactionType.WITHDRAWAL || type == TransactionType.TRANSFER) {
            if (request.getSourceAccountId() != null && !isSystemWallet(request.getSourceAccountId())) {
                com.bankledger.transaction.model.AccountLimit limit = accountLimitRepository.findById(request.getSourceAccountId()).orElse(null);
                if (limit != null) {
                    // --- 1. Channel Controls ---
                    String channel = request.getPaymentChannel() != null ? request.getPaymentChannel().toUpperCase() : "";
                    
                    if ("ONLINE".equals(channel) && limit.isBlockOnline()) {
                        return TransactionResponse.builder()
                                .status("FAILED")
                                .errorMessage("Transaction blocked: Online/E-commerce purchases are disabled on this account.")
                                .amount(request.getAmount())
                                .currency(request.getCurrency())
                                .transactionType(type.name())
                                .build();
                    }
                    
                    if ("CONTACTLESS".equals(channel)) {
                        if (limit.isBlockContactless()) {
                            return TransactionResponse.builder()
                                    .status("FAILED")
                                    .errorMessage("Transaction blocked: Contactless / Tap-to-Pay payments are disabled on this account.")
                                    .amount(request.getAmount())
                                    .currency(request.getCurrency())
                                    .transactionType(type.name())
                                    .build();
                        }
                        if (limit.getContactlessLimit() != null && request.getAmount().compareTo(limit.getContactlessLimit()) > 0) {
                            return TransactionResponse.builder()
                                    .status("FAILED")
                                    .errorMessage("Transaction blocked: Contactless amount exceeds your configured contactless limit of " + limit.getContactlessLimit())
                                    .amount(request.getAmount())
                                    .currency(request.getCurrency())
                                    .transactionType(type.name())
                                    .build();
                        }
                    }
                    
                    if ("ATM".equals(channel)) {
                        if (limit.isBlockAtm()) {
                            return TransactionResponse.builder()
                                    .status("FAILED")
                                    .errorMessage("Transaction blocked: ATM cash withdrawals are disabled on this account.")
                                    .amount(request.getAmount())
                                    .currency(request.getCurrency())
                                    .transactionType(type.name())
                                    .build();
                        }
                        
                        String reqPhone = request.getPhoneNumber();
                        if (reqPhone == null || reqPhone.trim().isEmpty()) {
                            return TransactionResponse.builder()
                                    .status("FAILED")
                                    .errorMessage("Transaction blocked: Phone number verification is required for ATM withdrawals.")
                                    .amount(request.getAmount())
                                    .currency(request.getCurrency())
                                    .transactionType(type.name())
                                    .build();
                        }
                        
                        String userPhone = accountClient.getPhoneNumber(request.getSourceAccountId());
                        boolean phoneMatches = false;
                        if (userPhone != null) {
                            String cleanUser = userPhone.replaceAll("\\D", "");
                            String cleanReq = reqPhone.replaceAll("\\D", "");
                            if (cleanUser.length() >= 10 && cleanReq.length() >= 10) {
                                phoneMatches = cleanUser.substring(cleanUser.length() - 10)
                                        .equals(cleanReq.substring(cleanReq.length() - 10));
                            } else {
                                phoneMatches = cleanUser.equals(cleanReq);
                            }
                        }
                        
                        if (!phoneMatches) {
                            return TransactionResponse.builder()
                                    .status("FAILED")
                                    .errorMessage("Transaction blocked: ATM verification failed. Phone number does not match registered profile.")
                                    .amount(request.getAmount())
                                    .currency(request.getCurrency())
                                    .transactionType(type.name())
                                    .build();
                        }
                    }

                    // --- 2. Category Blocks ---
                    String categoryUpper = category.toUpperCase();
                    if ("GAMBLING".equals(categoryUpper) && limit.isBlockGambling()) {
                        return TransactionResponse.builder()
                                .status("FAILED")
                                .errorMessage("Transaction blocked: Gambling transactions are disabled on this account.")
                                .amount(request.getAmount())
                                .currency(request.getCurrency())
                                .transactionType(type.name())
                                .build();
                    }
                    
                    if ("ENTERTAINMENT".equals(categoryUpper) && limit.isBlockEntertainment()) {
                        return TransactionResponse.builder()
                                .status("FAILED")
                                .errorMessage("Transaction blocked: Entertainment & Leisure purchases are disabled on this account.")
                                .amount(request.getAmount())
                                .currency(request.getCurrency())
                                .transactionType(type.name())
                                .build();
                    }

                    // Single Limit
                    if (limit.getSingleLimit() != null && request.getAmount().compareTo(limit.getSingleLimit()) > 0) {
                        return TransactionResponse.builder()
                                .status("FAILED")
                                .errorMessage("Transaction failed: Single transaction limit of " + limit.getSingleLimit() + " exceeded")
                                .amount(request.getAmount())
                                .currency(request.getCurrency())
                                .transactionType(type.name())
                                .build();
                    }

                    // Daily Limit
                    java.time.LocalDateTime startOfDay = java.time.LocalDate.now().atStartOfDay();
                    java.math.BigDecimal spentToday = transactionRepository.sumSpentByAccountSince(request.getSourceAccountId(), startOfDay);
                    java.math.BigDecimal totalToday = spentToday.add(request.getAmount());
                    if (limit.getDailyLimit() != null && totalToday.compareTo(limit.getDailyLimit()) > 0) {
                        return TransactionResponse.builder()
                                .status("FAILED")
                                .errorMessage("Transaction failed: Daily spending limit of " + limit.getDailyLimit() + " exceeded (Spent today: " + spentToday + ")")
                                .amount(request.getAmount())
                                .currency(request.getCurrency())
                                .transactionType(type.name())
                                .build();
                    }

                    // Weekly Limit (7 days rolling)
                    java.time.LocalDateTime startOfWeek = java.time.LocalDateTime.now().minusDays(7);
                    java.math.BigDecimal spentThisWeek = transactionRepository.sumSpentByAccountSince(request.getSourceAccountId(), startOfWeek);
                    java.math.BigDecimal totalWeek = spentThisWeek.add(request.getAmount());
                    if (limit.getWeeklyLimit() != null && totalWeek.compareTo(limit.getWeeklyLimit()) > 0) {
                        return TransactionResponse.builder()
                                .status("FAILED")
                                .errorMessage("Transaction failed: Weekly spending limit of " + limit.getWeeklyLimit() + " exceeded (Spent last 7 days: " + spentThisWeek + ")")
                                .amount(request.getAmount())
                                .currency(request.getCurrency())
                                .transactionType(type.name())
                                .build();
                    }
                }
            }
        }

        // 2. Create PENDING Transaction Record
        UUID txId = UUID.randomUUID();
        Transaction transaction = Transaction.builder()
                .id(txId)
                .sourceAccountId(request.getSourceAccountId())
                .targetAccountId(request.getTargetAccountId())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .transactionType(type)
                .status(TransactionStatus.PENDING)
                .idempotencyKey(request.getIdempotencyKey())
                .category(category)
                .build();

        transactionRepository.save(transaction);
        log.info("Saved PENDING transaction: id={}", txId);

        // 3. Synchronously Call Ledger Service
        LedgerTransactionRequest ledgerRequest = LedgerTransactionRequest.builder()
                .transactionId(txId)
                .sourceAccountId(request.getSourceAccountId())
                .targetAccountId(request.getTargetAccountId())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .idempotencyKey(request.getIdempotencyKey())
                .type(type.name())
                .category(category)
                .build();

        LedgerTransactionResponse ledgerResponse = ledgerClient.processTransaction(ledgerRequest);

        // 4. Update Transaction Status based on response
        if ("SUCCESS".equals(ledgerResponse.getStatus())) {
            transaction.setStatus(TransactionStatus.COMPLETED);
            
            // Trigger Live Notifications
            try {
                String amountStr = transaction.getCurrency() + " " + String.format("%,.2f", transaction.getAmount());
                if (type == TransactionType.DEPOSIT) {
                    notificationService.createNotification(
                        transaction.getTargetAccountId(),
                        "Cash Deposit Successful",
                        "Successfully deposited " + amountStr + " into your account."
                    );
                } else if (type == TransactionType.WITHDRAWAL) {
                    notificationService.createNotification(
                        transaction.getSourceAccountId(),
                        "Cash Withdrawal Successful",
                        "Successfully withdrew " + amountStr + " from your account."
                    );
                } else if (type == TransactionType.TRANSFER) {
                    // Notify sender
                    notificationService.createNotification(
                        transaction.getSourceAccountId(),
                        "Transfer Sent",
                        "Successfully transferred " + amountStr + " to recipient."
                    );
                    // Notify receiver
                    notificationService.createNotification(
                        transaction.getTargetAccountId(),
                        "Transfer Received",
                        "You received a transfer of " + amountStr + " from a contact."
                    );
                }
            } catch (Exception ex) {
                log.error("Failed to generate transaction live notification", ex);
            }

            // Trigger Cashback Rewards Rule Engine Hook
            try {
                UUID rewardUser = (type == TransactionType.DEPOSIT) ? transaction.getTargetAccountId() : transaction.getSourceAccountId();
                if (rewardUser != null) {
                    rewardService.processTransactionCashback(
                        rewardUser,
                        transaction.getId(),
                        type.name(),
                        transaction.getAmount().doubleValue(),
                        transaction.getCategory()
                    );
                }
            } catch (Exception ex) {
                log.error("Failed to process transaction rewards/cashback", ex);
            }
        } else {
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setErrorMessage(ledgerResponse.getMessage());
        }

        transactionRepository.save(transaction);
        log.info("Transaction {} updated to status: {}", txId, transaction.getStatus());

        // Save to chat messages history if it's a transfer
        if (type == TransactionType.TRANSFER && request.getSourceAccountId() != null) {
            try {
                String recipientPhone = request.getPhoneNumber();
                if (recipientPhone == null || recipientPhone.trim().isEmpty()) {
                    if (request.getTargetAccountId() != null) {
                        recipientPhone = accountClient.getPhoneNumber(request.getTargetAccountId());
                    }
                }
                
                if (recipientPhone != null) {
                    com.bankledger.transaction.model.ChatMessage chatMessage = com.bankledger.transaction.model.ChatMessage.builder()
                            .id(UUID.randomUUID())
                            .senderAccountId(request.getSourceAccountId())
                            .recipientPhoneNumber(recipientPhone)
                            .messageContent("Sent $" + request.getAmount())
                            .isPayment(true)
                            .paymentAmount(request.getAmount())
                            .paymentStatus(transaction.getStatus().name())
                            .build();
                    chatMessageRepository.save(chatMessage);
                }
            } catch (Exception e) {
                log.error("Failed to auto-save transaction to chat history", e);
            }
        }

        return mapToResponse(transaction);
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(UUID transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found: " + transactionId));
        return mapToResponse(transaction);
    }

    private TransactionResponse mapToResponse(Transaction transaction) {
        return TransactionResponse.builder()
                .id(transaction.getId())
                .sourceAccountId(transaction.getSourceAccountId())
                .targetAccountId(transaction.getTargetAccountId())
                .amount(transaction.getAmount())
                .currency(transaction.getCurrency())
                .transactionType(transaction.getTransactionType().name())
                .status(transaction.getStatus().name())
                .errorMessage(transaction.getErrorMessage())
                .category(transaction.getCategory())
                .createdAt(transaction.getCreatedAt())
                .build();
    }

    private boolean isSystemWallet(java.util.UUID uuid) {
        if (uuid == null) return false;
        String str = uuid.toString();
        return str.startsWith("e1b07221-50e5-4d76-bc34-31f41e57c6");
    }

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public java.util.List<com.bankledger.transaction.model.Transaction> getFailedTransactions(UUID accountId) {
        return transactionRepository.findBySourceAccountIdAndStatusOrderByCreatedAtDesc(
                accountId, com.bankledger.transaction.model.TransactionStatus.FAILED);
    }
}
