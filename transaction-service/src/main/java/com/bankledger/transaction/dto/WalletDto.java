package com.bankledger.transaction.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class WalletDto {
    private UUID id;
    private String name;
    private BigDecimal runningBalance;
    private BigDecimal lifetimeInflows;
    private BigDecimal lifetimeOutflows;
    private String currency;
    private String status;
}
