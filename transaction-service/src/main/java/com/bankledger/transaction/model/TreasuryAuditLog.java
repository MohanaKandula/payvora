package com.bankledger.transaction.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "treasury_audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TreasuryAuditLog {
    @Id
    private UUID id;

    @Column(name = "admin_user", nullable = false)
    private String adminUser;

    @Column(name = "action_type", nullable = false)
    private String actionType;

    @Column(name = "reference_id", nullable = false)
    private UUID referenceId;

    @Column(name = "wallet_id", nullable = false)
    private UUID walletId;

    @Column(name = "before_balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal beforeBalance;

    @Column(name = "after_balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal afterBalance;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "device_info")
    private String deviceInfo;

    @Column(name = "reason")
    private String reason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
