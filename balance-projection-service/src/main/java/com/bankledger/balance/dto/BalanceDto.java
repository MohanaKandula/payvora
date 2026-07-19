package com.bankledger.balance.dto;

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
public class BalanceDto {
    private UUID accountId;
    private BigDecimal currentBalance;
    private UUID lastLedgerEntryId;
    private LocalDateTime updatedAt;
}
