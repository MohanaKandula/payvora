package com.bankledger.transaction.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "account_limits")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountLimit {
    @Id
    @Column(name = "account_id")
    private UUID accountId;

    @Column(name = "daily_limit", precision = 19, scale = 4)
    private BigDecimal dailyLimit;

    @Column(name = "weekly_limit", precision = 19, scale = 4)
    private BigDecimal weeklyLimit;

    @Column(name = "single_limit", precision = 19, scale = 4)
    private BigDecimal singleLimit;

    @Column(name = "block_online")
    private boolean blockOnline;

    @Column(name = "block_contactless")
    private boolean blockContactless;

    @Column(name = "contactless_limit", precision = 19, scale = 4)
    private BigDecimal contactlessLimit;

    @Column(name = "block_atm")
    private boolean blockAtm;

    @Column(name = "block_gambling")
    private boolean blockGambling;

    @Column(name = "block_entertainment")
    private boolean blockEntertainment;
}
