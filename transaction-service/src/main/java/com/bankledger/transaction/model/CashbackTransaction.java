package com.bankledger.transaction.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cashback_transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CashbackTransaction {
    
    @Id
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "transaction_id")
    private UUID transactionId;
    
    @Column(name = "cashback_amount", nullable = false, columnDefinition = "numeric")
    private double cashbackAmount;
    
    @Column(name = "offer_id")
    private UUID offerId;
    
    @Column(nullable = false)
    private String status; // PENDING, CREDITED, EXPIRED, REDEEMED
    
    @Column(name = "credited_at", nullable = false)
    private LocalDateTime creditedAt;
    
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
}
