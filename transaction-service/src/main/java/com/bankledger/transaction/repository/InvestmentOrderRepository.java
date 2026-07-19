package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.InvestmentOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface InvestmentOrderRepository extends JpaRepository<InvestmentOrder, UUID> {
    List<InvestmentOrder> findByStatus(String status);
}
