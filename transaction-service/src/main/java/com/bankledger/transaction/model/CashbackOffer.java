package com.bankledger.transaction.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cashback_offers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CashbackOffer {
    
    @Id
    private UUID id;
    
    @Column(nullable = false)
    private String title;
    
    @Column(nullable = false, length = 1000)
    private String description;
    
    @Column(name = "transaction_type", nullable = false)
    private String transactionType; // DEPOSIT, WITHDRAWAL, TRANSFER
    
    @Column(name = "min_amount", nullable = false, columnDefinition = "numeric")
    private double minAmount;
    
    @Column(name = "cashback_percentage", nullable = false, columnDefinition = "numeric")
    private double cashbackPercentage;
    
    @Column(name = "fixed_cashback", nullable = false, columnDefinition = "numeric")
    private double fixedCashback;
    
    @Column(name = "max_cashback", nullable = false, columnDefinition = "numeric")
    private double maxCashback;
    
    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDate;
    
    @Column(name = "end_date", nullable = false)
    private LocalDateTime endDate;
    
    @Column(nullable = false)
    private boolean active;
}
