package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.TreasuryAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TreasuryAuditLogRepository extends JpaRepository<TreasuryAuditLog, UUID> {
    List<TreasuryAuditLog> findByWalletIdOrderByCreatedAtDesc(UUID walletId);
    List<TreasuryAuditLog> findAllByOrderByCreatedAtDesc();
}
