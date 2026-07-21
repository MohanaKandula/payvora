package com.bankledger.transaction.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "support_tickets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportTicket {

    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "category", nullable = false)
    private String category;

    @Column(name = "subject", nullable = false)
    private String subject;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "priority", nullable = false)
    private String priority; // LOW, MEDIUM, HIGH, URGENT

    @Column(name = "status", nullable = false)
    private String status; // OPEN, IN_PROGRESS, RESOLVED, CLOSED

    @Column(name = "admin_response", columnDefinition = "text")
    private String adminResponse;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
