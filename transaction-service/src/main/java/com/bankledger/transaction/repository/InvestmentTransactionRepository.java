package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.InvestmentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InvestmentTransactionRepository extends JpaRepository<InvestmentTransaction, UUID> {
    List<InvestmentTransaction> findByInvestmentIdOrderByCreatedAtDesc(UUID investmentId);
}
