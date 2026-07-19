package com.bankledger.balance.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpendingAggregateId implements Serializable {
    private UUID accountId;
    private String category;
}
