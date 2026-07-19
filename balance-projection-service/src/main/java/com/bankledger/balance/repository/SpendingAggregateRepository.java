package com.bankledger.balance.repository;

import com.bankledger.balance.model.SpendingAggregate;
import com.bankledger.balance.model.SpendingAggregateId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SpendingAggregateRepository extends JpaRepository<SpendingAggregate, SpendingAggregateId> {
    List<SpendingAggregate> findByAccountId(UUID accountId);
}
