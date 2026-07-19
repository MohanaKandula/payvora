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
@Table(name = "investment_accounts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvestmentAccount {
    @Id
    private UUID id; // typically matches accountId / userId

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "invested_balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal investedBalance;

    @Column(name = "total_yield_earned", nullable = false, precision = 19, scale = 4)
    private BigDecimal totalYieldEarned;

    @Column(name = "apy_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal apyRate;

    @Column(nullable = false, length = 50)
    private String status; // ACTIVE, PAUSED

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
