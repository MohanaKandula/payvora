package com.bankledger.account.dto;

import com.bankledger.account.model.AccountStatus;
import com.bankledger.account.model.KycStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountResponse {
    private UUID id;
    private String email;
    private String fullName;
    private String username;
    private KycStatus kycStatus;
    private AccountStatus status;
    private String kycDocumentType;
    private String kycDocumentBase64;
    private String kycDocumentNumber;
    private String kycSelfieBase64;
    private boolean mfaEnabled;
    private boolean pinSet;
    private String phoneNumber;
    private String kycErrorDetails;
    private String kycProvider;
    private String referralCode;
    private String referredBy;
    private java.math.BigDecimal faceMatchScore;
    private java.math.BigDecimal ocrConfidence;
    private Integer riskScore;
    private LocalDateTime createdAt;
}
