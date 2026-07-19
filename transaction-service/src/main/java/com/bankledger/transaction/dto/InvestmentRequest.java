package com.bankledger.transaction.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class InvestmentRequest {
    private String assetType;
    private BigDecimal principal;
    private BigDecimal expectedReturn;
    private String notes;
    private String riskRating;
    private String ipAddress;
    private String deviceInfo;
}
