package com.bankledger.account.repository;

import com.bankledger.account.model.KYCVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface KYCVerificationRepository extends JpaRepository<KYCVerification, UUID> {
    Optional<KYCVerification> findByUserId(UUID userId);
    Optional<KYCVerification> findTopByUserIdOrderBySubmittedAtDesc(UUID userId);
    boolean existsByDocumentNumberAndStatus(String documentNumber, String status);
}
