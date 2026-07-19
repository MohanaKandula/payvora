package com.bankledger.transaction.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

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
    private BigDecimal apyRate;

    @Column(name = "yield_engine_paused", nullable = false)
    private boolean yieldEnginePaused;
}
