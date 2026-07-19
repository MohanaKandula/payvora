package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.ScheduledPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ScheduledPaymentRepository extends JpaRepository<ScheduledPayment, UUID> {
    List<ScheduledPayment> findBySourceAccountId(UUID sourceAccountId);
    List<ScheduledPayment> findByStatusAndNextRunAtBefore(String status, LocalDateTime dateTime);
}
