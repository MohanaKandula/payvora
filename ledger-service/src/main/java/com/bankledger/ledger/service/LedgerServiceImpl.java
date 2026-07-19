package com.bankledger.ledger.service;

import com.bankledger.ledger.dto.LedgerEntryDto;
import com.bankledger.ledger.dto.TransactionRequest;
import com.bankledger.ledger.dto.TransactionResponse;
import com.bankledger.ledger.event.TransactionCompletedEvent;
import com.bankledger.ledger.model.LedgerAccount;
import com.bankledger.ledger.model.LedgerEntry;
import com.bankledger.ledger.repository.LedgerAccountRepository;
import com.bankledger.ledger.repository.LedgerEntryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class LedgerServiceImpl implements LedgerService {

    @Autowired
    private LedgerAccountRepository ledgerAccountRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Override
    @Transactional
    public TransactionResponse processTransaction(TransactionRequest request) {
        log.info("Processing transaction request: txId={}, type={}, key={}", 
                request.getTransactionId(), request.getType(), request.getIdempotencyKey());

        // 1. Idempotency Check
        List<LedgerEntry> existingEntries = ledgerEntryRepository.findByTransactionId(request.getTransactionId());
        if (!existingEntries.isEmpty()) {
            log.info("Duplicate request detected for transactionId={}. Returning cached state.", request.getTransactionId());
            return buildIdempotentResponse(request.getTransactionId(), existingEntries);
        }

        // Alternative check using the unique idempotency key
        if (ledgerEntryRepository.existsByIdempotencyKeyAndEntryType(request.getIdempotencyKey(), "DEBIT") ||
                ledgerEntryRepository.existsByIdempotencyKeyAndEntryType(request.getIdempotencyKey(), "CREDIT")) {
            log.info("Duplicate request detected for idempotencyKey={}. Returning cached state.", request.getIdempotencyKey());
            // Fetch by key to reconstruct
            // In a transfer, we will have both. Just find the entries that match this key.
            List<LedgerEntry> entries = ledgerEntryRepository.findAll().stream()
                    .filter(e -> e.getIdempotencyKey().equals(request.getIdempotencyKey()))
                    .collect(Collectors.toList());
            return buildIdempotentResponse(request.getTransactionId(), entries);
        }

        // 2. Perform validation & apply entries
        TransactionResponse response;
        try {
            switch (request.getType().toUpperCase()) {
                case "DEPOSIT":
                    response = executeDeposit(request);
                    break;
                case "WITHDRAWAL":
                    response = executeWithdrawal(request);
                    break;
                case "TRANSFER":
                    response = executeTransfer(request);
                    break;
                default:
                    throw new IllegalArgumentException("Unknown transaction type: " + request.getType());
            }
        } catch (Exception e) {
            log.error("Transaction failed: {}", e.getMessage());
            return TransactionResponse.builder()
                    .status("FAILED")
                    .transactionId(request.getTransactionId())
                    .message(e.getMessage())
                    .build();
        }

        return response;
    }

    private TransactionResponse executeDeposit(TransactionRequest request) {
        UUID targetId = request.getTargetAccountId();
        if (targetId == null) {
            throw new IllegalArgumentException("Target account ID is required for deposit");
        }
        UUID clearingId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c604");

        // Deadlock Avoidance: Lock in deterministic sorting order by UUID
        LedgerAccount target;
        LedgerAccount clearing;
        if (targetId.compareTo(clearingId) < 0) {
            target = ledgerAccountRepository.findAndLockById(targetId)
                    .orElseGet(() -> ledgerAccountRepository.save(LedgerAccount.builder()
                            .id(targetId).status("ACTIVE").runningBalance(BigDecimal.ZERO.setScale(4))
                            .currency(request.getCurrency() != null ? request.getCurrency() : "USD").build()));
            clearing = ledgerAccountRepository.findAndLockById(clearingId)
                    .orElseGet(() -> ledgerAccountRepository.save(LedgerAccount.builder()
                            .id(clearingId).status("ACTIVE").runningBalance(BigDecimal.ZERO.setScale(4))
                            .currency(request.getCurrency() != null ? request.getCurrency() : "USD").build()));
        } else {
            clearing = ledgerAccountRepository.findAndLockById(clearingId)
                    .orElseGet(() -> ledgerAccountRepository.save(LedgerAccount.builder()
                            .id(clearingId).status("ACTIVE").runningBalance(BigDecimal.ZERO.setScale(4))
                            .currency(request.getCurrency() != null ? request.getCurrency() : "USD").build()));
            target = ledgerAccountRepository.findAndLockById(targetId)
                    .orElseGet(() -> ledgerAccountRepository.save(LedgerAccount.builder()
                            .id(targetId).status("ACTIVE").runningBalance(BigDecimal.ZERO.setScale(4))
                            .currency(request.getCurrency() != null ? request.getCurrency() : "USD").build()));
        }

        validateAccountActive(target);
        validateAccountActive(clearing);

        BigDecimal targetBalanceAfter = target.getRunningBalance().add(request.getAmount());
        BigDecimal clearingBalanceAfter = clearing.getRunningBalance().subtract(request.getAmount());
        String category = request.getCategory() == null || request.getCategory().trim().isEmpty() ? "OTHERS" : request.getCategory().toUpperCase();

        LedgerEntry debitEntry = LedgerEntry.builder()
                .id(UUID.randomUUID())
                .transactionId(request.getTransactionId())
                .account(clearing)
                .entryType("DEBIT")
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .balanceAfter(clearingBalanceAfter)
                .idempotencyKey(request.getIdempotencyKey())
                .category(category)
                .build();

        LedgerEntry creditEntry = LedgerEntry.builder()
                .id(UUID.randomUUID())
                .transactionId(request.getTransactionId())
                .account(target)
                .entryType("CREDIT")
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .balanceAfter(targetBalanceAfter)
                .idempotencyKey(request.getIdempotencyKey())
                .category(category)
                .build();

        verifyDoubleEntryLegs(debitEntry, creditEntry);

        ledgerEntryRepository.save(debitEntry);
        ledgerEntryRepository.save(creditEntry);

        target.setRunningBalance(targetBalanceAfter);
        clearing.setRunningBalance(clearingBalanceAfter);

        ledgerAccountRepository.save(target);
        ledgerAccountRepository.save(clearing);

        log.info("Deposit successful: target={}, balance_after={}, clearing_balance_after={}", targetId, targetBalanceAfter, clearingBalanceAfter);

        registerPostCommitEvent(debitEntry, request.getCategory());
        registerPostCommitEvent(creditEntry, request.getCategory());

        return TransactionResponse.builder()
                .status("SUCCESS")
                .transactionId(request.getTransactionId())
                .targetBalanceAfter(targetBalanceAfter)
                .message("Deposit successful")
                .build();
    }

    private TransactionResponse executeWithdrawal(TransactionRequest request) {
        UUID sourceId = request.getSourceAccountId();
        if (sourceId == null) {
            throw new IllegalArgumentException("Source account ID is required for withdrawal");
        }
        UUID clearingId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c604");

        // Deadlock Avoidance: Lock in deterministic sorting order by UUID
        LedgerAccount source;
        LedgerAccount clearing;
        if (sourceId.compareTo(clearingId) < 0) {
            source = ledgerAccountRepository.findAndLockById(sourceId)
                    .orElseGet(() -> ledgerAccountRepository.save(LedgerAccount.builder()
                            .id(sourceId).status("ACTIVE").runningBalance(BigDecimal.ZERO.setScale(4))
                            .currency(request.getCurrency() != null ? request.getCurrency() : "USD").build()));
            clearing = ledgerAccountRepository.findAndLockById(clearingId)
                    .orElseGet(() -> ledgerAccountRepository.save(LedgerAccount.builder()
                            .id(clearingId).status("ACTIVE").runningBalance(BigDecimal.ZERO.setScale(4))
                            .currency(request.getCurrency() != null ? request.getCurrency() : "USD").build()));
        } else {
            clearing = ledgerAccountRepository.findAndLockById(clearingId)
                    .orElseGet(() -> ledgerAccountRepository.save(LedgerAccount.builder()
                            .id(clearingId).status("ACTIVE").runningBalance(BigDecimal.ZERO.setScale(4))
                            .currency(request.getCurrency() != null ? request.getCurrency() : "USD").build()));
            source = ledgerAccountRepository.findAndLockById(sourceId)
                    .orElseGet(() -> ledgerAccountRepository.save(LedgerAccount.builder()
                            .id(sourceId).status("ACTIVE").runningBalance(BigDecimal.ZERO.setScale(4))
                            .currency(request.getCurrency() != null ? request.getCurrency() : "USD").build()));
        }

        validateAccountActive(source);
        validateAccountActive(clearing);
        validateSufficientBalance(source, request.getAmount());

        BigDecimal sourceBalanceAfter = source.getRunningBalance().subtract(request.getAmount());
        BigDecimal clearingBalanceAfter = clearing.getRunningBalance().add(request.getAmount());
        String category = request.getCategory() == null || request.getCategory().trim().isEmpty() ? "OTHERS" : request.getCategory().toUpperCase();

        LedgerEntry debitEntry = LedgerEntry.builder()
                .id(UUID.randomUUID())
                .transactionId(request.getTransactionId())
                .account(source)
                .entryType("DEBIT")
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .balanceAfter(sourceBalanceAfter)
                .idempotencyKey(request.getIdempotencyKey())
                .category(category)
                .build();

        LedgerEntry creditEntry = LedgerEntry.builder()
                .id(UUID.randomUUID())
                .transactionId(request.getTransactionId())
                .account(clearing)
                .entryType("CREDIT")
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .balanceAfter(clearingBalanceAfter)
                .idempotencyKey(request.getIdempotencyKey())
                .category(category)
                .build();

        verifyDoubleEntryLegs(debitEntry, creditEntry);

        ledgerEntryRepository.save(debitEntry);
        ledgerEntryRepository.save(creditEntry);

        source.setRunningBalance(sourceBalanceAfter);
        clearing.setRunningBalance(clearingBalanceAfter);

        ledgerAccountRepository.save(source);
        ledgerAccountRepository.save(clearing);

        log.info("Withdrawal successful: source={}, balance_after={}, clearing_balance_after={}", sourceId, sourceBalanceAfter, clearingBalanceAfter);

        registerPostCommitEvent(debitEntry, request.getCategory());
        registerPostCommitEvent(creditEntry, request.getCategory());

        return TransactionResponse.builder()
                .status("SUCCESS")
                .transactionId(request.getTransactionId())
                .sourceBalanceAfter(sourceBalanceAfter)
                .message("Withdrawal successful")
                .build();
    }

    private TransactionResponse executeTransfer(TransactionRequest request) {
        UUID sourceId = request.getSourceAccountId();
        UUID targetId = request.getTargetAccountId();
        if (sourceId == null || targetId == null) {
            throw new IllegalArgumentException("Both Source and Target account IDs are required for a transfer");
        }
        if (sourceId.equals(targetId)) {
            throw new IllegalArgumentException("Source and Target accounts cannot be the same");
        }

        // Deadlock Avoidance: Lock in deterministic sorting order by UUID
        LedgerAccount source;
        LedgerAccount target;
        if (sourceId.compareTo(targetId) < 0) {
            source = ledgerAccountRepository.findAndLockById(sourceId)
                    .orElseGet(() -> {
                        LedgerAccount newAcc = LedgerAccount.builder()
                                .id(sourceId)
                                .status("ACTIVE")
                                .runningBalance(BigDecimal.ZERO.setScale(4))
                                .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                                .build();
                        return ledgerAccountRepository.save(newAcc);
                    });
            target = ledgerAccountRepository.findAndLockById(targetId)
                    .orElseGet(() -> {
                        LedgerAccount newAcc = LedgerAccount.builder()
                                .id(targetId)
                                .status("ACTIVE")
                                .runningBalance(BigDecimal.ZERO.setScale(4))
                                .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                                .build();
                        return ledgerAccountRepository.save(newAcc);
                    });
        } else {
            target = ledgerAccountRepository.findAndLockById(targetId)
                    .orElseGet(() -> {
                        LedgerAccount newAcc = LedgerAccount.builder()
                                .id(targetId)
                                .status("ACTIVE")
                                .runningBalance(BigDecimal.ZERO.setScale(4))
                                .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                                .build();
                        return ledgerAccountRepository.save(newAcc);
                    });
            source = ledgerAccountRepository.findAndLockById(sourceId)
                    .orElseGet(() -> {
                        LedgerAccount newAcc = LedgerAccount.builder()
                                .id(sourceId)
                                .status("ACTIVE")
                                .runningBalance(BigDecimal.ZERO.setScale(4))
                                .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                                .build();
                        return ledgerAccountRepository.save(newAcc);
                    });
        }

        validateAccountActive(source);
        validateAccountActive(target);
        validateSufficientBalance(source, request.getAmount());

        BigDecimal sourceBalanceAfter = source.getRunningBalance().subtract(request.getAmount());
        BigDecimal targetBalanceAfter = target.getRunningBalance().add(request.getAmount());

        String category = request.getCategory() == null || request.getCategory().trim().isEmpty() ? "OTHERS" : request.getCategory().toUpperCase();

        // Create DEBIT entry
        LedgerEntry debitEntry = LedgerEntry.builder()
                .id(UUID.randomUUID())
                .transactionId(request.getTransactionId())
                .account(source)
                .entryType("DEBIT")
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .balanceAfter(sourceBalanceAfter)
                .idempotencyKey(request.getIdempotencyKey())
                .category(category)
                .build();

        // Create CREDIT entry
        LedgerEntry creditEntry = LedgerEntry.builder()
                .id(UUID.randomUUID())
                .transactionId(request.getTransactionId())
                .account(target)
                .entryType("CREDIT")
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .balanceAfter(targetBalanceAfter)
                .idempotencyKey(request.getIdempotencyKey())
                .category(category)
                .build();

        verifyDoubleEntryLegs(debitEntry, creditEntry);

        ledgerEntryRepository.save(debitEntry);
        ledgerEntryRepository.save(creditEntry);

        source.setRunningBalance(sourceBalanceAfter);
        target.setRunningBalance(targetBalanceAfter);

        ledgerAccountRepository.save(source);
        ledgerAccountRepository.save(target);

        log.info("Transfer successful: source={}, target={}, amount={}, sourceBalanceAfter={}, targetBalanceAfter={}",
                sourceId, targetId, request.getAmount(), sourceBalanceAfter, targetBalanceAfter);

        registerPostCommitEvent(debitEntry, request.getCategory());
        registerPostCommitEvent(creditEntry, request.getCategory());

        return TransactionResponse.builder()
                .status("SUCCESS")
                .transactionId(request.getTransactionId())
                .sourceBalanceAfter(sourceBalanceAfter)
                .targetBalanceAfter(targetBalanceAfter)
                .message("Transfer successful")
                .build();
    }

    private void validateAccountActive(LedgerAccount account) {
        if (!"ACTIVE".equalsIgnoreCase(account.getStatus())) {
            throw new IllegalArgumentException("Account is not active: status is " + account.getStatus());
        }
    }

    private void validateSufficientBalance(LedgerAccount account, BigDecimal debitAmount) {
        String accountIdStr = account.getId() != null ? account.getId().toString() : "";
        
        // Only Founder Capital (00) and Clearing/Settlement (04) can bypass sufficient balance checks
        if (accountIdStr.equals("e1b07221-50e5-4d76-bc34-31f41e57c600") || 
            accountIdStr.equals("e1b07221-50e5-4d76-bc34-31f41e57c604")) {
            return;
        }
        
        if (account.getRunningBalance().compareTo(debitAmount) < 0) {
            String errorMsg = "Insufficient funds in account " + account.getId() + 
                    ". Available: " + account.getRunningBalance() + ", Requested: " + debitAmount;
            
            // Customize error message for specific treasury wallets
            if (accountIdStr.equals("e1b07221-50e5-4d76-bc34-31f41e57c605")) {
                errorMsg = "Rewards budget exhausted. Cashback Wallet has insufficient funds.";
            } else if (accountIdStr.equals("e1b07221-50e5-4d76-bc34-31f41e57c603")) {
                errorMsg = "Yield Reserve has insufficient funds to cover yield payout.";
            } else if (accountIdStr.startsWith("e1b07221-50e5-4d76-bc34-31f41e57c6")) {
                errorMsg = "Insufficient wallet funds in source wallet: " + account.getId();
            }
            
            throw new IllegalArgumentException(errorMsg);
        }
    }

    private void registerPostCommitEvent(LedgerEntry entry, String category) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                TransactionCompletedEvent event = TransactionCompletedEvent.builder()
                        .eventId(UUID.randomUUID())
                        .transactionId(entry.getTransactionId())
                        .accountId(entry.getAccount().getId())
                        .entryType(entry.getEntryType())
                        .amount(entry.getAmount())
                        .currency(entry.getCurrency())
                        .balanceAfter(entry.getBalanceAfter())
                        .idempotencyKey(entry.getIdempotencyKey())
                        .category(category)
                        .createdAt(entry.getCreatedAt())
                        .build();

                String topic = "transaction.completed";
                String key = event.getAccountId().toString();
                log.info("Publishing TransactionCompletedEvent to Kafka topic {}: {}", topic, event);
                kafkaTemplate.send(topic, key, event);
            }
        });
    }

    private TransactionResponse buildIdempotentResponse(UUID transactionId, List<LedgerEntry> entries) {
        BigDecimal sourceBal = null;
        BigDecimal targetBal = null;
        for (LedgerEntry entry : entries) {
            if ("DEBIT".equals(entry.getEntryType())) {
                sourceBal = entry.getBalanceAfter();
            } else if ("CREDIT".equals(entry.getEntryType())) {
                targetBal = entry.getBalanceAfter();
            }
        }
        return TransactionResponse.builder()
                .status("SUCCESS")
                .transactionId(transactionId)
                .sourceBalanceAfter(sourceBal)
                .targetBalanceAfter(targetBal)
                .message("Transaction completed (idempotent duplicate)")
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LedgerEntryDto> getAccountHistory(UUID accountId) {
        return ledgerEntryRepository.findByAccountIdOrderByCreatedAtDesc(accountId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LedgerEntryDto> getAllEntries() {
        return ledgerEntryRepository.findAllByOrderByCreatedAtAsc().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private LedgerEntryDto mapToDto(LedgerEntry entry) {
        return LedgerEntryDto.builder()
                .id(entry.getId())
                .transactionId(entry.getTransactionId())
                .accountId(entry.getAccount().getId())
                .entryType(entry.getEntryType())
                .amount(entry.getAmount())
                .currency(entry.getCurrency())
                .balanceAfter(entry.getBalanceAfter())
                .idempotencyKey(entry.getIdempotencyKey())
                .category(entry.getCategory())
                .createdAt(entry.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public com.bankledger.ledger.model.LedgerAccount getAccount(UUID accountId) {
        return ledgerAccountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Ledger account not found for ID: " + accountId));
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateStatementPdf(UUID accountId, String yearMonth) {
        try {
            // Parse year and month (format: YYYY-MM)
            String[] parts = yearMonth.split("-");
            int year = Integer.parseInt(parts[0]);
            int month = Integer.parseInt(parts[1]);

            // Calculate start and end date of the month
            java.time.YearMonth ym = java.time.YearMonth.of(year, month);
            LocalDateTime start = ym.atDay(1).atStartOfDay();
            LocalDateTime end = ym.atEndOfMonth().atTime(23, 59, 59);

            // Fetch entries for this month
            List<LedgerEntry> entries = ledgerEntryRepository.findByAccountIdAndCreatedAtBetweenOrderByCreatedAtAsc(accountId, start, end);

            // Calculate starting balance: get the last entry before start of this month
            BigDecimal startingBalance = ledgerEntryRepository.findFirstByAccountIdAndCreatedAtBeforeOrderByCreatedAtDesc(accountId, start)
                    .map(LedgerEntry::getBalanceAfter)
                    .orElse(BigDecimal.ZERO.setScale(4));

            // Calculate ending balance: get the last entry of this month, or starting balance if no entries
            BigDecimal endingBalance = entries.isEmpty() 
                    ? startingBalance 
                    : entries.get(entries.size() - 1).getBalanceAfter();

            // Create Document
            com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4);
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            com.lowagie.text.pdf.PdfWriter.getInstance(document, out);
            document.open();

            // Add Fonts and Title
            com.lowagie.text.Font titleFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 18);
            com.lowagie.text.Font subFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 11);
            com.lowagie.text.Font bodyFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 10);
            com.lowagie.text.Font headerFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 10);

            // Header Section
            com.lowagie.text.Paragraph title = new com.lowagie.text.Paragraph("EVENT-SOURCED LEDGER STATEMENT", titleFont);
            title.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // Metadata info
            com.lowagie.text.Paragraph meta = new com.lowagie.text.Paragraph();
            meta.add(new com.lowagie.text.Chunk("Account ID: " + accountId.toString() + "\n", bodyFont));
            meta.add(new com.lowagie.text.Chunk("Statement Period: " + ym.getMonth().toString() + " " + year + "\n", bodyFont));
            meta.add(new com.lowagie.text.Chunk("Generated At: " + LocalDateTime.now().toString() + "\n", bodyFont));
            meta.setSpacingAfter(20);
            document.add(meta);

            // Summary Table
            com.lowagie.text.pdf.PdfPTable summaryTable = new com.lowagie.text.pdf.PdfPTable(2);
            summaryTable.setWidthPercentage(100);
            summaryTable.setSpacingAfter(20);

            summaryTable.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Starting Balance", subFont)));
            summaryTable.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("$ " + startingBalance.setScale(2, java.math.RoundingMode.HALF_UP).toString(), subFont)));
            summaryTable.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Ending Balance", subFont)));
            summaryTable.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("$ " + endingBalance.setScale(2, java.math.RoundingMode.HALF_UP).toString(), subFont)));
            document.add(summaryTable);

            // Transactions Table Header
            com.lowagie.text.Paragraph txHeader = new com.lowagie.text.Paragraph("TRANSACTIONS RECORD", subFont);
            txHeader.setSpacingAfter(10);
            document.add(txHeader);

            com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{2.5f, 2f, 1.5f, 1.5f, 2.5f, 2f});
            table.setSpacingAfter(20);

            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Date", headerFont)));
            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Transaction ID", headerFont)));
            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Entry", headerFont)));
            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Amount", headerFont)));
            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Category", headerFont)));
            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Running Balance", headerFont)));

            for (LedgerEntry entry : entries) {
                table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(entry.getCreatedAt().toString(), bodyFont)));
                table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(entry.getTransactionId().toString().substring(0, 8) + "...", bodyFont)));
                table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(entry.getEntryType(), bodyFont)));
                table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(entry.getAmount().setScale(2, java.math.RoundingMode.HALF_UP).toString(), bodyFont)));
                table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(entry.getCategory() != null ? entry.getCategory() : "OTHERS", bodyFont)));
                table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(entry.getBalanceAfter().setScale(2, java.math.RoundingMode.HALF_UP).toString(), bodyFont)));
            }

            table.setSpacingAfter(40);
            document.add(table);
            document.close();

            return out.toByteArray();

        } catch (Exception e) {
            log.error("Failed to generate statement PDF", e);
            throw new RuntimeException("Could not generate statement PDF", e);
        }
    }

    private void verifyDoubleEntryLegs(LedgerEntry debitEntry, LedgerEntry creditEntry) {
        if (debitEntry == null) {
            throw new IllegalArgumentException("Ledger transaction integrity violation: Missing Debit Entry.");
        }
        if (creditEntry == null) {
            throw new IllegalArgumentException("Ledger transaction integrity violation: Missing Credit Entry.");
        }
        if (!"DEBIT".equalsIgnoreCase(debitEntry.getEntryType())) {
            throw new IllegalArgumentException("Ledger transaction integrity violation: Invalid entry type for debit leg.");
        }
        if (!"CREDIT".equalsIgnoreCase(creditEntry.getEntryType())) {
            throw new IllegalArgumentException("Ledger transaction integrity violation: Invalid entry type for credit leg.");
        }
        if (debitEntry.getAmount().compareTo(creditEntry.getAmount()) != 0) {
            throw new IllegalArgumentException("Ledger transaction integrity violation: Debit amount (" 
                    + debitEntry.getAmount() + ") does not match Credit amount (" + creditEntry.getAmount() + ").");
        }
        if (!debitEntry.getTransactionId().equals(creditEntry.getTransactionId())) {
            throw new IllegalArgumentException("Ledger transaction integrity violation: Transaction ID mismatch.");
        }
    }
}
