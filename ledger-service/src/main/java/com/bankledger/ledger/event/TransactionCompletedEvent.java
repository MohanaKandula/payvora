package com.bankledger.ledger.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionCompletedEvent {
    private UUID eventId;
    private UUID transactionId;
    private UUID accountId;
    private String entryType; // DEBIT | CREDIT
    private BigDecimal amount;
    private String currency;
    private BigDecimal balanceAfter;
    private String idempotencyKey;
    private String category;
    private LocalDateTime createdAt;
}
