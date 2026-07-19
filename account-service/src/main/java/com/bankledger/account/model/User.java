package com.bankledger.account.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @OneToOne(fetch = FetchType.EAGER, cascade = CascadeType.ALL)
    @JoinColumn(name = "account_id")
    private Account account;

    @Column(name = "mfa_enabled", nullable = false)
    private boolean mfaEnabled;

    @Column(name = "mfa_secret", length = 100)
    private String mfaSecret;

    @Column(name = "kyc_status", nullable = false, length = 20)
    private String kycStatus; // NOT_STARTED | PENDING | APPROVED | REJECTED

    @Column(name = "kyc_document_type", length = 20)
    private String kycDocumentType;

    @Column(name = "kyc_document_base64")
    private String kycDocumentBase64;

    @Column(name = "kyc_document_number", length = 50)
    private String kycDocumentNumber;

    @Column(name = "kyc_selfie_base64")
    private String kycSelfieBase64;

    @Column(name = "kyc_error_details", length = 1000)
    private String kycErrorDetails;

    @Column(name = "backup_codes", length = 1000)
    private String backupCodes;

    @Column(name = "transaction_pin", length = 100)
    private String transactionPin;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "otp_code", length = 10)
    private String otpCode;

    @Column(name = "otp_expiry")
    private java.time.LocalDateTime otpExpiry;

    @Column(name = "referral_code", unique = true, length = 50)
    private String referralCode;

    @Column(name = "referred_by", length = 50)
    private String referredBy;


    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
