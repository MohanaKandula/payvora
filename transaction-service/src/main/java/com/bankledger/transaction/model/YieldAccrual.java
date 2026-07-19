package com.bankledger.transaction.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "yield_accruals")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YieldAccrual {
    @Id
    private UUID id;

    @Column(name = "investment_id", nullable = false)
    private UUID investmentId;

    @Column(name = "principal_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal principalAmount;

    @Column(name = "daily_rate", nullable = false, precision = 19, scale = 8)
    private BigDecimal dailyRate;

    @Column(name = "yield_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal yieldAmount;

    @Column(name = "accrual_date", nullable = false)
    private LocalDate accrualDate;
}
