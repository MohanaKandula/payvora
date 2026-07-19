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
@Table(name = "investment_orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvestmentOrder {
    @Id
    private UUID id;

    @Column(name = "asset_type", nullable = false)
    private String assetType;

    @Column(name = "principal", nullable = false, precision = 19, scale = 4)
    private BigDecimal principal;

    @Column(name = "expected_return", nullable = false, precision = 19, scale = 4)
    private BigDecimal expectedReturn;

    @Column(name = "actual_return", precision = 19, scale = 4)
    private BigDecimal actualReturn;

    @Column(name = "status", nullable = false)
    private String status; // PENDING, ACTIVE, MATURED, FAILED, CANCELLED

    @Column(name = "notes")
    private String notes;

    @Column(name = "risk_rating")
    private String riskRating;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "invested_at")
    private LocalDateTime investedAt;

    @Column(name = "matured_at")
    private LocalDateTime maturedAt;

    @Column(name = "failed_at")
    private LocalDateTime failedAt;

    @Column(name = "maturity_date", nullable = false)
    private LocalDateTime maturityDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
