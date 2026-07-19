package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.TreasuryProfitLoss;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface TreasuryProfitLossRepository extends JpaRepository<TreasuryProfitLoss, UUID> {
    List<TreasuryProfitLoss> findAllByOrderByPeriodAsc();
}
