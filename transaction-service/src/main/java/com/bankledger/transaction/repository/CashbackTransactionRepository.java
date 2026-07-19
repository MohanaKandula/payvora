package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.CashbackTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface CashbackTransactionRepository extends JpaRepository<CashbackTransaction, UUID> {
    List<CashbackTransaction> findByUserIdOrderByCreditedAtDesc(UUID userId);
}
