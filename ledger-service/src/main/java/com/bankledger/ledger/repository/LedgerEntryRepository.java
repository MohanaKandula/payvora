package com.bankledger.ledger.repository;

import com.bankledger.ledger.model.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {
    boolean existsByIdempotencyKeyAndEntryType(String idempotencyKey, String entryType);
    List<LedgerEntry> findByAccountIdOrderByCreatedAtDesc(UUID accountId);
    List<LedgerEntry> findAllByOrderByCreatedAtAsc();
    List<LedgerEntry> findByAccountIdAndCreatedAtBetweenOrderByCreatedAtAsc(UUID accountId, java.time.LocalDateTime start, java.time.LocalDateTime end);
    java.util.Optional<LedgerEntry> findFirstByAccountIdAndCreatedAtBeforeOrderByCreatedAtDesc(UUID accountId, java.time.LocalDateTime date);
    List<LedgerEntry> findByTransactionId(UUID transactionId);
}
