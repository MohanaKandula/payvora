package com.bankledger.account.repository;

import com.bankledger.account.model.KYCAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface KYCAuditLogRepository extends JpaRepository<KYCAuditLog, UUID> {
    List<KYCAuditLog> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
