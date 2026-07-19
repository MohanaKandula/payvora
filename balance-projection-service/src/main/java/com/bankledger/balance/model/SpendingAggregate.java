package com.bankledger.balance.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "spending_aggregates")
@IdClass(SpendingAggregateId.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpendingAggregate {

    @Id
    @Column(name = "account_id")
    private UUID accountId;

    @Id
    @Column(name = "category")
    private String category;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;
}
