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

    @Column(name = "last_spin_date")
    private java.time.LocalDate lastSpinDate;

    @Column(name = "checkin_streak", nullable = false)
    private int checkinStreak = 0;

    @Transient
    private boolean claimedToday;

    @Transient
    private boolean spunToday;

    public java.time.LocalDate getLastSpinDate() {
        return lastSpinDate;
    }

    public void setLastSpinDate(java.time.LocalDate lastSpinDate) {
        this.lastSpinDate = lastSpinDate;
    }

    public boolean isSpunToday() {
        return spunToday;
    }

    public boolean getSpunToday() {
        return spunToday;
    }

    public void setSpunToday(boolean spunToday) {
        this.spunToday = spunToday;
    }

    public int getCheckinStreak() {
        return checkinStreak;
    }

    public void setCheckinStreak(int checkinStreak) {
        this.checkinStreak = checkinStreak;
    }

    public boolean isClaimedToday() {
        return claimedToday;
    }

    public boolean getClaimedToday() {
        return claimedToday;
    }

    public void setClaimedToday(boolean claimedToday) {
        this.claimedToday = claimedToday;
    }
}
