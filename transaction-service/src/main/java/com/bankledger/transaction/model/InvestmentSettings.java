package com.bankledger.transaction.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "investment_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvestmentSettings {
    @Id
    private String id; // GLOBAL

    @Column(name = "apy_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal apyRate; // User APY

    @Column(name = "gross_apy_rate", precision = 5, scale = 2)
    private BigDecimal grossApyRate; // Gross Investment APY

    @Column(name = "platform_spread", precision = 5, scale = 2)
    private BigDecimal platformSpread; // Platform Spread

    @Column(name = "yield_engine_paused", nullable = false)
    private boolean yieldEnginePaused;

    @Column(name = "effective_from")
    private LocalDateTime effectiveFrom;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    private Long version;
}
