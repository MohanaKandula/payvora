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
@Table(name = "investment_transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvestmentTransaction {
    @Id
    private UUID id;

    @Column(name = "investment_id", nullable = false)
    private UUID investmentId;

    @Column(nullable = false, length = 50)
    private String type; // INVESTMENT_DEPOSIT, INVESTMENT_WITHDRAWAL, YIELD_CREDIT, YIELD_REVERSAL

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(length = 255)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
