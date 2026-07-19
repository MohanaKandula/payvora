package com.bankledger.transaction.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "treasury_profit_loss")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TreasuryProfitLoss {
    @Id
    private UUID id;

    @Column(name = "period", nullable = false)
    private String period; // YYYY-MM

    @Column(name = "gross_yield", nullable = false, precision = 19, scale = 4)
    private BigDecimal grossYield;

    @Column(name = "user_interest_paid", nullable = false, precision = 19, scale = 4)
    private BigDecimal userInterestPaid;

    @Column(name = "reserve_contribution", nullable = false, precision = 19, scale = 4)
    private BigDecimal reserveContribution;

    @Column(name = "platform_revenue", nullable = false, precision = 19, scale = 4)
    private BigDecimal platformRevenue;

    @Column(name = "investment_losses", nullable = false, precision = 19, scale = 4)
    private BigDecimal investmentLosses;

    @Column(name = "net_profit", nullable = false, precision = 19, scale = 4)
    private BigDecimal netProfit;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
