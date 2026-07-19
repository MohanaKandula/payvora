package com.bankledger.transaction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TreasuryHistoryDto {
    private UUID transactionId;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private String operationType;
    private String sourceWallet;
    private String destinationWallet;
    private BigDecimal debitAmount;
    private BigDecimal creditAmount;
    private String currency;
    private String category;
    private String status;
    private String triggeredBy;
    private String reference;
    private String description;
    private BigDecimal balanceBefore;
    private BigDecimal balanceAfter;
    private List<LedgerEntryDto> ledgerEntries;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LedgerEntryDto {
        private String entryId;
        private String accountId;
        private String accountName;
        private String entryType;
        private BigDecimal amount;
        private BigDecimal balanceAfter;
    }
}
