package com.bankledger.transaction.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class StressTestResult {
    private String scenarioName;
    private BigDecimal portfolioYield;
    private BigDecimal userObligations;
    private BigDecimal expectedReturns;
    private BigDecimal expectedDeficit;
    private BigDecimal capitalRequired;
    private BigDecimal survivalRunway;
}
