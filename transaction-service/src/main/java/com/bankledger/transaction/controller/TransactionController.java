package com.bankledger.transaction.controller;

import com.bankledger.transaction.dto.TransactionRequest;
import com.bankledger.transaction.dto.TransactionResponse;
import com.bankledger.transaction.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private com.bankledger.transaction.client.AccountClient accountClient;

    @PostMapping("/deposit")
    public ResponseEntity<TransactionResponse> deposit(
            @RequestHeader(value = "X-User-Name", required = false) String username,
            @Valid @RequestBody TransactionRequest request) {
        request.setRequestUsername(username);
        TransactionResponse response = transactionService.deposit(request);
        if ("FAILED".equals(response.getStatus())) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/withdraw")
    public ResponseEntity<TransactionResponse> withdraw(
            @RequestHeader(value = "X-User-Name", required = false) String username,
            @Valid @RequestBody TransactionRequest request) {
        request.setRequestUsername(username);
        TransactionResponse response = transactionService.withdraw(request);
        if ("FAILED".equals(response.getStatus())) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/transfer")
    public ResponseEntity<TransactionResponse> transfer(
            @RequestHeader(value = "X-User-Name", required = false) String username,
            @Valid @RequestBody TransactionRequest request) {
        request.setRequestUsername(username);
        TransactionResponse response = transactionService.transfer(request);
        if ("FAILED".equals(response.getStatus())) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionResponse> getTransactionById(@PathVariable UUID id) {
        return ResponseEntity.ok(transactionService.getTransactionById(id));
    }

    @GetMapping("/failed/{accountId}")
    public ResponseEntity<java.util.List<com.bankledger.transaction.model.Transaction>> getFailedTransactions(@PathVariable UUID accountId) {
        return ResponseEntity.ok(transactionService.getFailedTransactions(accountId));
    }

    // --- Account Limits Endpoints ---

    @Autowired
    private com.bankledger.transaction.repository.AccountLimitRepository accountLimitRepository;

    @GetMapping("/limits/{accountId}")
    public ResponseEntity<com.bankledger.transaction.model.AccountLimit> getLimits(@PathVariable UUID accountId) {
        com.bankledger.transaction.model.AccountLimit limit = accountLimitRepository.findById(accountId)
                .orElse(com.bankledger.transaction.model.AccountLimit.builder()
                        .accountId(accountId)
                        .build());
        return ResponseEntity.ok(limit);
    }

    @PostMapping("/limits/{accountId}")
    public ResponseEntity<com.bankledger.transaction.model.AccountLimit> saveLimits(
            @PathVariable UUID accountId,
            @RequestBody com.bankledger.transaction.model.AccountLimit limitRequest) {
        limitRequest.setAccountId(accountId);
        return ResponseEntity.ok(accountLimitRepository.save(limitRequest));
    }

    // --- Virtual Cards Endpoints ---

    @Autowired
    private com.bankledger.transaction.repository.VirtualCardRepository virtualCardRepository;

    @GetMapping("/cards/{accountId}")
    public ResponseEntity<java.util.List<com.bankledger.transaction.model.VirtualCard>> getCards(@PathVariable UUID accountId) {
        return ResponseEntity.ok(virtualCardRepository.findByAccountId(accountId));
    }

    @PostMapping("/cards")
    public ResponseEntity<com.bankledger.transaction.model.VirtualCard> createCard(
            @RequestBody java.util.Map<String, Object> body) {
        UUID accountId = UUID.fromString(body.get("accountId").toString());
        String name = body.get("cardholderName") != null ? body.get("cardholderName").toString() : "Cardholder";
        
        java.math.BigDecimal cardLimit = body.get("cardLimit") != null 
                ? new java.math.BigDecimal(body.get("cardLimit").toString()) 
                : new java.math.BigDecimal("5000.00");

        String colorTheme = body.get("colorTheme") != null ? body.get("colorTheme").toString() : "midnight";
        boolean isSingleUse = body.get("isSingleUse") != null && Boolean.parseBoolean(body.get("isSingleUse").toString());
        String cardNickname = body.get("cardNickname") != null && !body.get("cardNickname").toString().trim().isEmpty()
                ? body.get("cardNickname").toString().trim()
                : "Virtual Card";

        // Generate card details
        java.util.Random rand = new java.util.Random();
        StringBuilder cardNo = new StringBuilder("4532"); // Visa prefix
        for (int i = 0; i < 12; i++) {
            cardNo.append(rand.nextInt(10));
        }
        
        String cvv = String.format("%03d", rand.nextInt(1000));
        
        java.time.LocalDate expiry = java.time.LocalDate.now().plusYears(4);
        String expiryDate = String.format("%02d/%d", expiry.getMonthValue(), expiry.getYear() % 100);

        com.bankledger.transaction.model.VirtualCard card = com.bankledger.transaction.model.VirtualCard.builder()
                .id(UUID.randomUUID())
                .accountId(accountId)
                .cardNumber(cardNo.toString())
                .cardholderName(name)
                .cvv(cvv)
                .expiryDate(expiryDate)
                .status("ACTIVE")
                .cardLimit(cardLimit)
                .spentAmount(java.math.BigDecimal.ZERO)
                .colorTheme(colorTheme)
                .isSingleUse(isSingleUse)
                .cardNickname(cardNickname)
                .build();

        return ResponseEntity.ok(virtualCardRepository.save(card));
    }

    @PostMapping("/cards/{cardId}/pin")
    public ResponseEntity<com.bankledger.transaction.model.VirtualCard> updateCardPin(
            @PathVariable UUID cardId,
            @RequestParam String pin) {
        if (pin == null || pin.length() != 4 || !pin.matches("\\d+")) {
            throw new IllegalArgumentException("PIN must be exactly 4 digits");
        }
        com.bankledger.transaction.model.VirtualCard card = virtualCardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));
        
        card.setPin(pin);
        return ResponseEntity.ok(virtualCardRepository.save(card));
    }

    @PostMapping("/cards/{cardId}/toggle-freeze")
    public ResponseEntity<com.bankledger.transaction.model.VirtualCard> toggleFreezeCard(@PathVariable UUID cardId) {
        com.bankledger.transaction.model.VirtualCard card = virtualCardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));
        
        card.setStatus("ACTIVE".equals(card.getStatus()) ? "FROZEN" : "ACTIVE");
        return ResponseEntity.ok(virtualCardRepository.save(card));
    }

    @PostMapping("/cards/{cardId}/terminate")
    public ResponseEntity<com.bankledger.transaction.model.VirtualCard> terminateCard(@PathVariable UUID cardId) {
        com.bankledger.transaction.model.VirtualCard card = virtualCardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));
        
        card.setStatus("TERMINATED");
        return ResponseEntity.ok(virtualCardRepository.save(card));
    }

    @PostMapping("/cards/{cardId}/pay")
    public ResponseEntity<TransactionResponse> cardPayment(
            @PathVariable UUID cardId,
            @RequestBody java.util.Map<String, Object> request) {
        com.bankledger.transaction.model.VirtualCard card = virtualCardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));

        if ("TERMINATED".equals(card.getStatus())) {
            return ResponseEntity.badRequest().body(TransactionResponse.builder()
                    .status("FAILED")
                    .errorMessage("Card has been deactivated / terminated (Disposable card)")
                    .build());
        }

        if (!"ACTIVE".equals(card.getStatus())) {
            return ResponseEntity.badRequest().body(TransactionResponse.builder()
                    .status("FAILED")
                    .errorMessage("Card is frozen")
                    .build());
        }

        // Basic verification
        String reqNo = request.get("cardNumber").toString();
        String reqCvv = request.get("cvv").toString();
        String reqExp = request.get("expiryDate").toString();
        java.math.BigDecimal amount = new java.math.BigDecimal(request.get("amount").toString());

        if (!card.getCardNumber().equals(reqNo) || !card.getCvv().equals(reqCvv) || !card.getExpiryDate().equals(reqExp)) {
            return ResponseEntity.badRequest().body(TransactionResponse.builder()
                    .status("FAILED")
                    .errorMessage("Invalid card details")
                    .build());
        }

        java.math.BigDecimal currentSpent = card.getSpentAmount() != null ? card.getSpentAmount() : java.math.BigDecimal.ZERO;
        java.math.BigDecimal totalProposed = currentSpent.add(amount);

        if (card.getCardLimit() != null && totalProposed.compareTo(card.getCardLimit()) > 0) {
            return ResponseEntity.badRequest().body(TransactionResponse.builder()
                    .status("FAILED")
                    .errorMessage("Transaction exceeds card spending limit. Spent: $" + currentSpent + " / Limit: $" + card.getCardLimit())
                    .build());
        }

        // Process as withdrawal from the account
        TransactionRequest txRequest = new TransactionRequest();
        txRequest.setSourceAccountId(card.getAccountId());
        txRequest.setAmount(amount);
        txRequest.setCurrency("USD");
        txRequest.setCategory("OTHERS");
        txRequest.setPaymentChannel("ONLINE"); // This is an online purchase!
        txRequest.setIdempotencyKey(UUID.randomUUID().toString()); // card purchase generates fresh idempotency key

        TransactionResponse response = transactionService.withdraw(txRequest);
        
        if ("FAILED".equals(response.getStatus())) {
            return ResponseEntity.badRequest().body(response);
        }
        
        // If successful, increment the card's spentAmount
        card.setSpentAmount(totalProposed);

        // If successfully completed and card is single-use, deactivate it
        if ("COMPLETED".equals(response.getStatus()) && card.isSingleUse()) {
            card.setStatus("TERMINATED");
        }
        
        virtualCardRepository.save(card);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/cards/{cardId}/refund")
    public ResponseEntity<TransactionResponse> cardRefund(
            @PathVariable UUID cardId,
            @RequestBody java.util.Map<String, Object> request) {
        com.bankledger.transaction.model.VirtualCard card = virtualCardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));

        // Basic verification of card details
        String reqNo = request.get("cardNumber").toString();
        String reqCvv = request.get("cvv").toString();
        String reqExp = request.get("expiryDate").toString();
        java.math.BigDecimal amount = new java.math.BigDecimal(request.get("amount").toString());

        if (!card.getCardNumber().equals(reqNo) || !card.getCvv().equals(reqCvv) || !card.getExpiryDate().equals(reqExp)) {
            return ResponseEntity.badRequest().body(TransactionResponse.builder()
                    .status("FAILED")
                    .errorMessage("Invalid card details")
                    .build());
        }

        // Process as deposit into the account - bypassing frozen/spent status checks
        TransactionRequest txRequest = new TransactionRequest();
        txRequest.setTargetAccountId(card.getAccountId());
        txRequest.setAmount(amount);
        txRequest.setCurrency("USD");
        txRequest.setCategory("OTHERS");
        txRequest.setIdempotencyKey(UUID.randomUUID().toString()); // refund generates fresh idempotency key

        TransactionResponse response = transactionService.deposit(txRequest);
        
        if ("FAILED".equals(response.getStatus())) {
            return ResponseEntity.badRequest().body(response);
        }
        
        // Decrement the spentAmount down to a minimum of 0.00
        java.math.BigDecimal currentSpent = card.getSpentAmount() != null ? card.getSpentAmount() : java.math.BigDecimal.ZERO;
        java.math.BigDecimal newSpent = currentSpent.subtract(amount);
        if (newSpent.compareTo(java.math.BigDecimal.ZERO) < 0) {
            newSpent = java.math.BigDecimal.ZERO;
        }
        card.setSpentAmount(newSpent);
        virtualCardRepository.save(card);
        
        return ResponseEntity.ok(response);
    }

    // --- Scheduled Payments Endpoints ---

    @Autowired
    private com.bankledger.transaction.repository.ScheduledPaymentRepository scheduledPaymentRepository;

    @Autowired
    private com.bankledger.transaction.repository.TransactionRepository transactionRepository;

    @GetMapping("/recurring/{accountId}")
    public ResponseEntity<java.util.List<com.bankledger.transaction.model.ScheduledPayment>> getScheduledPayments(@PathVariable UUID accountId) {
        return ResponseEntity.ok(scheduledPaymentRepository.findBySourceAccountId(accountId));
    }

    @PostMapping("/recurring")
    public ResponseEntity<com.bankledger.transaction.model.ScheduledPayment> createScheduledPayment(
            @RequestBody com.bankledger.transaction.model.ScheduledPayment payment) {
        
        // Enforce bank transfers only in this module
        if (!"TRANSFER".equals(payment.getPaymentType())) {
            return ResponseEntity.badRequest().build();
        }
        if (payment.getTargetAccountId() == null) {
            return ResponseEntity.badRequest().build();
        }
        if (payment.getSourceAccountId() != null && 
            payment.getSourceAccountId().equals(payment.getTargetAccountId())) {
            return ResponseEntity.badRequest().build();
        }

        payment.setId(UUID.randomUUID());
        if (payment.getNextRunAt() == null) {
            payment.setNextRunAt(java.time.LocalDateTime.now().plusMinutes(5));
        }
        
        // Force frequency to ONCE (one-shot scheduled transfer)
        payment.setFrequency("ONCE");
        payment.setStatus("Scheduled");
        
        return ResponseEntity.ok(scheduledPaymentRepository.save(payment));
    }

    @PostMapping("/recurring/{id}/cancel")
    public ResponseEntity<com.bankledger.transaction.model.ScheduledPayment> cancelScheduledPayment(@PathVariable UUID id) {
        com.bankledger.transaction.model.ScheduledPayment payment = scheduledPaymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Scheduled payment not found"));
        
        if (!"Scheduled".equals(payment.getStatus())) {
            return ResponseEntity.badRequest().build();
        }
        
        payment.setStatus("Cancelled");
        return ResponseEntity.ok(scheduledPaymentRepository.save(payment));
    }

    @GetMapping("/{id}/statement")
    public ResponseEntity<byte[]> getTransactionStatement(
            @PathVariable UUID id,
            @RequestParam UUID accountId) {
        
        com.bankledger.transaction.model.Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
        
        String senderName = "PayVora User";
        String recipientName = "PayVora User";
        
        try {
            if (tx.getSourceAccountId() != null) {
                java.util.Map senderDetails = accountClient.getAccountDetails(tx.getSourceAccountId());
                if (senderDetails != null && senderDetails.containsKey("fullName")) {
                    senderName = senderDetails.get("fullName").toString();
                }
            }
        } catch (Exception e) {
            // Ignore
        }
        
        try {
            if (tx.getTargetAccountId() != null) {
                java.util.Map receiverDetails = accountClient.getAccountDetails(tx.getTargetAccountId());
                if (receiverDetails != null && receiverDetails.containsKey("fullName")) {
                    recipientName = receiverDetails.get("fullName").toString();
                }
            }
        } catch (Exception e) {
            // Ignore
        }
        
        boolean isSender = accountId.equals(tx.getSourceAccountId());
        
        try {
            com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A5); // A5 is perfect
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            com.lowagie.text.pdf.PdfWriter.getInstance(document, out);
            document.open();
            
            com.lowagie.text.Font titleFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 14);
            com.lowagie.text.Font keyFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 10);
            com.lowagie.text.Font valFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 10);
            
            // Header
            String titleText = isSender ? "Scheduled Transfer Statement" : "Amount Received Statement";
            com.lowagie.text.Paragraph title = new com.lowagie.text.Paragraph(titleText.toUpperCase(), titleFont);
            title.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);
            
            // Subtitle
            com.lowagie.text.Paragraph brand = new com.lowagie.text.Paragraph("PAYVORA AUTOMATED VALIDATION SYSTEM", com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 8));
            brand.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            brand.setSpacingAfter(20);
            document.add(brand);
            
            com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(2);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.5f, 2.5f});
            
            String refNo = "UTR" + tx.getId().toString().substring(0, 8).toUpperCase();
            
            if (isSender) {
                // Scheduled Transfer
                // Amount
                // Beneficiary
                // Reference Number
                // Scheduled Date
                // Execution Date
                // Status
                
                table.addCell(createCell("Scheduled Transfer", keyFont));
                table.addCell(createCell("Automatic Bank Transfer", valFont));
                
                table.addCell(createCell("Amount", keyFont));
                table.addCell(createCell(tx.getCurrency() + " " + tx.getAmount().setScale(2, java.math.RoundingMode.HALF_UP).toString(), valFont));
                
                table.addCell(createCell("Beneficiary", keyFont));
                table.addCell(createCell(recipientName, valFont));
                
                table.addCell(createCell("Reference Number", keyFont));
                table.addCell(createCell(refNo, valFont));
                
                table.addCell(createCell("Scheduled Date", keyFont));
                table.addCell(createCell(tx.getCreatedAt().toString(), valFont));
                
                table.addCell(createCell("Execution Date", keyFont));
                table.addCell(createCell(tx.getUpdatedAt().toString(), valFont));
                
                table.addCell(createCell("Status", keyFont));
                table.addCell(createCell(tx.getStatus().toString(), valFont));
            } else {
                // Amount Received
                // Sender
                // Reference Number
                // Credit Date
                // Status
                
                table.addCell(createCell("Amount Received", keyFont));
                table.addCell(createCell(tx.getCurrency() + " " + tx.getAmount().setScale(2, java.math.RoundingMode.HALF_UP).toString(), valFont));
                
                table.addCell(createCell("Sender", keyFont));
                table.addCell(createCell(senderName, valFont));
                
                table.addCell(createCell("Reference Number", keyFont));
                table.addCell(createCell(refNo, valFont));
                
                table.addCell(createCell("Credit Date", keyFont));
                table.addCell(createCell(tx.getUpdatedAt().toString(), valFont));
                
                table.addCell(createCell("Status", keyFont));
                table.addCell(createCell(tx.getStatus().toString(), valFont));
            }
            
            document.add(table);
            document.close();
            
            byte[] pdfBytes = out.toByteArray();
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/pdf")
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=statement_" + id.toString().substring(0, 8) + ".pdf")
                    .body(pdfBytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    private com.lowagie.text.pdf.PdfPCell createCell(String text, com.lowagie.text.Font font) {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(text, font));
        cell.setPadding(8);
        cell.setBorderColor(new java.awt.Color(220, 220, 220));
        return cell;
    }

    @Autowired
    private com.bankledger.transaction.scheduler.ScheduledTask scheduledTask;

    @PostMapping("/interest/trigger")
    public ResponseEntity<java.util.Map<String, String>> triggerInterestAccrual() {
        scheduledTask.accrueInterestInternal();
        java.util.Map<String, String> response = new java.util.HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "Daily interest accrual triggered successfully.");
        return ResponseEntity.ok(response);
    }

    @Autowired
    private com.bankledger.transaction.repository.ChatMessageRepository chatMessageRepository;

    @GetMapping("/chat/history")
    public ResponseEntity<java.util.List<com.bankledger.transaction.model.ChatMessage>> getChatHistory(
            @RequestParam UUID myAccountId,
            @RequestParam String recipientPhone) {
        
        String myPhone = accountClient.getPhoneNumber(myAccountId);
        if (myPhone == null) {
            myPhone = "";
        }
        
        UUID recipientAccountId = null;
        try {
            java.util.Map recipientAcc = accountClient.getAccountByPhoneNumber(recipientPhone);
            if (recipientAcc != null && recipientAcc.containsKey("id") && recipientAcc.get("id") != null) {
                recipientAccountId = UUID.fromString(recipientAcc.get("id").toString());
            }
        } catch (Exception e) {
            // Recipient not registered
        }
        
        return ResponseEntity.ok(chatMessageRepository.findChatHistory(myAccountId, myPhone, recipientAccountId, recipientPhone));
    }

    @GetMapping("/chat/recipients")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getRecentRecipients(@RequestParam UUID myAccountId) {
        String myPhone = accountClient.getPhoneNumber(myAccountId);
        if (myPhone == null) {
            myPhone = "";
        }

        // 1. Phones we sent messages to
        java.util.List<String> sentPhones = chatMessageRepository.findRecipientPhoneNumbersBySender(myAccountId);
        java.util.Set<String> allUniquePhones = new java.util.HashSet<>(sentPhones);

        // 2. Senders who sent messages to us
        java.util.List<UUID> senderIds = chatMessageRepository.findSenderAccountIdsByRecipientPhone(myPhone);
        for (UUID sId : senderIds) {
            try {
                String senderPhone = accountClient.getPhoneNumber(sId);
                if (senderPhone != null && !senderPhone.trim().isEmpty()) {
                    allUniquePhones.add(senderPhone);
                }
            } catch (Exception e) {
                // Ignore
            }
        }

        final String finalMyPhone = myPhone;
        java.util.List<java.util.Map<String, Object>> results = allUniquePhones.parallelStream().map(phone -> {
            java.util.Map<String, Object> contact = new java.util.concurrent.ConcurrentHashMap<>();
            contact.put("phoneNumber", phone);
            contact.put("fullName", "User (" + phone + ")");
            contact.put("kycStatus", "NOT_STARTED");
            
            UUID recipientAccountId = null;
            try {
                java.util.Map acc = accountClient.getAccountByPhoneNumber(phone);
                if (acc != null) {
                    if (acc.containsKey("fullName") && acc.get("fullName") != null) {
                        contact.put("fullName", acc.get("fullName").toString());
                    }
                    if (acc.containsKey("kycStatus") && acc.get("kycStatus") != null) {
                        contact.put("kycStatus", acc.get("kycStatus").toString());
                    }
                    if (acc.containsKey("id") && acc.get("id") != null) {
                        recipientAccountId = UUID.fromString(acc.get("id").toString());
                    }
                }
            } catch (Exception e) {
                // Not found
            }

            // Count messages
            long msgCount = 0;
            if (recipientAccountId != null) {
                msgCount = chatMessageRepository.countUnreadMessages(finalMyPhone, recipientAccountId);
            }
            contact.put("messageCount", msgCount);

            return contact;
        }).collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(results);
    }

    @PostMapping("/chat/send")
    public ResponseEntity<com.bankledger.transaction.model.ChatMessage> sendChatMessage(
            @RequestBody com.bankledger.transaction.model.ChatMessage message) {
        
        message.setId(UUID.randomUUID());
        message.setPayment(false);
        message.setPaymentAmount(null);
        message.setPaymentStatus(null);
        
        return ResponseEntity.ok(chatMessageRepository.save(message));
    }

    @PostMapping("/chat/mark-read")
    public ResponseEntity<Void> markMessagesAsRead(
            @RequestParam UUID myAccountId,
            @RequestParam String senderPhone) {
        String myPhone = accountClient.getPhoneNumber(myAccountId);
        if (myPhone == null) {
            myPhone = "";
        }
        
        UUID senderAccountId = null;
        try {
            java.util.Map acc = accountClient.getAccountByPhoneNumber(senderPhone);
            if (acc != null && acc.containsKey("id") && acc.get("id") != null) {
                senderAccountId = UUID.fromString(acc.get("id").toString());
            }
        } catch (Exception e) {
            // Not found
        }
        
        if (senderAccountId != null) {
            chatMessageRepository.markMessagesAsRead(myPhone, senderAccountId);
        }
        
        return ResponseEntity.ok().build();
    }
}
