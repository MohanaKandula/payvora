package com.bankledger.transaction.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "reward_wallets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardWallet {
    
    @Id
    @Column(name = "user_id")
    private UUID userId;
    
    @Column(name = "cashback_balance", nullable = false, columnDefinition = "numeric")
    private double cashbackBalance;
    
    @Column(name = "total_cashback_earned", nullable = false, columnDefinition = "numeric")
    private double totalCashbackEarned;
    
    @Column(name = "cashback_used", nullable = false, columnDefinition = "numeric")
    private double cashbackUsed;
    
    @Column(name = "loyalty_points", nullable = false)
    private int loyaltyPoints;
    
    @Column(name = "loyalty_level", nullable = false)
    private String loyaltyLevel; // BRONZE, SILVER, GOLD, PLATINUM
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
