package com.bankledger.transaction.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "daily_checkins", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "checkin_date"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyCheckin {
    
    @Id
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "checkin_date", nullable = false)
    private LocalDate checkinDate;
    
    @Column(name = "points_earned", nullable = false)
    private int pointsEarned;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Transient
    private double cashbackEarned;

    @Transient
    private int currentStreak;
}
