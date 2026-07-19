package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.YieldAccrual;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface YieldAccrualRepository extends JpaRepository<YieldAccrual, UUID> {
    List<YieldAccrual> findByInvestmentIdOrderByAccrualDateDesc(UUID investmentId);
    List<YieldAccrual> findTop50ByOrderByAccrualDateDesc();
}
