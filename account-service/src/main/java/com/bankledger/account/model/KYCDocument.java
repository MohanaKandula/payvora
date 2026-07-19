package com.bankledger.account.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "kyc_documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KYCDocument {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "document_front_url", nullable = false, columnDefinition = "TEXT")
    private String documentFrontUrl;

    @Column(name = "document_back_url", columnDefinition = "TEXT")
    private String documentBackUrl;

    @Column(name = "selfie_url", nullable = false, columnDefinition = "TEXT")
    private String selfieUrl;

    @Column(nullable = false)
    private boolean encrypted;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;
}
