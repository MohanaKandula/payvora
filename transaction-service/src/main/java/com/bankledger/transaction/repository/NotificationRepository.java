package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByAccountIdOrderByCreatedAtDesc(UUID accountId);
    long countByAccountIdAndIsReadFalse(UUID accountId);
}
