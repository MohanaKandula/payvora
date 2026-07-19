package com.bankledger.transaction.client.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedgerTransactionResponse {
    private String status; // SUCCESS, FAILED
    private UUID transactionId;
    private String message;
    private BigDecimal sourceBalanceAfter;
    private BigDecimal targetBalanceAfter;
}
