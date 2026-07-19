package com.bankledger.account.repository;

import com.bankledger.account.model.KYCDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface KYCDocumentRepository extends JpaRepository<KYCDocument, UUID> {
    Optional<KYCDocument> findByUserId(UUID userId);
}
