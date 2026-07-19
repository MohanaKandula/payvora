package com.bankledger.transaction.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "virtual_cards")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VirtualCard {
    @Id
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "card_number", nullable = false, length = 16)
    private String cardNumber;

    @Column(name = "cardholder_name", nullable = false, length = 100)
    private String cardholderName;

    @Column(nullable = false, length = 3)
    private String cvv;

    @Column(name = "expiry_date", nullable = false, length = 5)
    private String expiryDate; // MM/YY

    @Column(nullable = false, length = 20)
    private String status; // ACTIVE | FROZEN

    @Column(name = "card_limit", precision = 19, scale = 4)
    private BigDecimal cardLimit;

    @Builder.Default
    @Column(name = "spent_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal spentAmount = BigDecimal.ZERO;

    @Column(name = "color_theme", nullable = false, length = 30)
    private String colorTheme;

    @Column(name = "is_single_use", nullable = false)
    private boolean isSingleUse;

    @Builder.Default
    @Column(name = "card_nickname", nullable = false, length = 100)
    private String cardNickname = "Virtual Card";

    @Builder.Default
    @Column(name = "pin", length = 4)
    private String pin = "0000";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
