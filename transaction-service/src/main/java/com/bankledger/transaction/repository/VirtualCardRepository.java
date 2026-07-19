package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.VirtualCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VirtualCardRepository extends JpaRepository<VirtualCard, UUID> {
    List<VirtualCard> findByAccountId(UUID accountId);
    Optional<VirtualCard> findByCardNumber(String cardNumber);
}
