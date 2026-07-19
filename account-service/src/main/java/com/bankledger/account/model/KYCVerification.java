package com.bankledger.account.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "kyc_verifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KYCVerification {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "kyc_id", nullable = false, length = 50)
    private String kycId;

    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    @Column(name = "document_number", nullable = false, length = 100)
    private String documentNumber;

    @Column(nullable = false, length = 50)
    private String status; // PENDING | PROCESSING | APPROVED | REJECTED | UNDER_REVIEW

    @Column(name = "face_match_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal faceMatchScore;

    @Column(name = "ocr_confidence", nullable = false, precision = 5, scale = 2)
    private BigDecimal ocrConfidence;

    @Column(name = "risk_score", nullable = false)
    private int riskScore;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;
}
