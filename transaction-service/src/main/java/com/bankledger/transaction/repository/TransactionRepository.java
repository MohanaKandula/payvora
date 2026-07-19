package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);
    boolean existsByIdempotencyKey(String idempotencyKey);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
            "WHERE t.sourceAccountId = :accountId " +
            "AND t.status = com.bankledger.transaction.model.TransactionStatus.COMPLETED " +
            "AND t.createdAt >= :startDate " +
            "AND (t.transactionType = com.bankledger.transaction.model.TransactionType.WITHDRAWAL " +
            "OR t.transactionType = com.bankledger.transaction.model.TransactionType.TRANSFER)")
    java.math.BigDecimal sumSpentByAccountSince(
            @org.springframework.data.repository.query.Param("accountId") UUID accountId,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDateTime startDate);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT t.sourceAccountId FROM Transaction t WHERE t.sourceAccountId IS NOT NULL")
    java.util.List<UUID> findDistinctSourceAccountIds();

    java.util.List<Transaction> findBySourceAccountIdAndStatusOrderByCreatedAtDesc(
            UUID sourceAccountId, com.bankledger.transaction.model.TransactionStatus status);
}
