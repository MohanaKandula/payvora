package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, String> {
    List<SupportTicket> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<SupportTicket> findAllByOrderByCreatedAtDesc();
    long countByStatusIn(List<String> statuses);
}
