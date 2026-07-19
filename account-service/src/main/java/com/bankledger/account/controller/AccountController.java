package com.bankledger.account.controller;

import com.bankledger.account.dto.AccountResponse;
import com.bankledger.account.security.UserDetailsImpl;
import com.bankledger.account.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    @Autowired
    private AccountService accountService;

    @Autowired
    private com.bankledger.account.service.KycVerificationService kycVerificationService;

    @GetMapping("/me")
    public ResponseEntity<AccountResponse> getMyAccount(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null || userDetails.getAccountId() == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(accountService.getAccountById(userDetails.getAccountId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> getAccountById(@PathVariable UUID id) {
        return ResponseEntity.ok(accountService.getAccountById(id));
    }

    @GetMapping("/by-phone")
    public ResponseEntity<AccountResponse> getAccountByPhoneNumber(@RequestParam String phoneNumber) {
        return ResponseEntity.ok(accountService.getAccountByPhoneNumber(phoneNumber));
    }

    @PostMapping("/mfa/verify-transfer")
    public ResponseEntity<Boolean> verifyTransferMfa(
            @RequestParam String username,
            @RequestParam String code) {
        return ResponseEntity.ok(accountService.verifyTransferMfa(username, code));
    }

    @PostMapping("/kyc")
    public ResponseEntity<java.util.Map<String, String>> uploadKyc(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody java.util.Map<String, String> request) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        String documentType = request.get("documentType");
        String documentBase64 = request.get("documentBase64");
        String documentBackBase64 = request.get("documentBackBase64");
        String documentNumber = request.get("documentNumber");
        String selfieBase64 = request.get("selfieBase64");
        String dob = request.get("dob");
        String gender = request.get("gender");
        String address = request.get("address");
        
        try {
            accountService.uploadKyc(
                userDetails.getUsername(), documentType, documentBase64, documentBackBase64, 
                documentNumber, selfieBase64, dob, gender, address
            );
            
            com.bankledger.account.dto.AccountResponse accountResponse = accountService.getAccountByUsername(userDetails.getUsername());
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", accountResponse.getKycStatus().name());
            response.put("message", "KYC verification processed. Status: " + accountResponse.getKycStatus());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "REJECTED");
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/kyc/ocr-extract")
    public ResponseEntity<java.util.Map<String, Object>> ocrExtract(
            @RequestBody java.util.Map<String, String> request) {
        
        String documentType = request.get("documentType");
        String frontBase64 = request.get("frontBase64");
        String backBase64 = request.get("backBase64");
        
        byte[] frontBytes = null;
        byte[] backBytes = null;
        
        try {
            if (frontBase64 != null && !frontBase64.trim().isEmpty()) {
                String clean = frontBase64;
                if (clean.contains(",")) {
                    clean = clean.split(",")[1];
                }
                frontBytes = java.util.Base64.getDecoder().decode(clean.trim());
            }
            
            if (backBase64 != null && !backBase64.trim().isEmpty()) {
                String clean = backBase64;
                if (clean.contains(",")) {
                    clean = clean.split(",")[1];
                }
                backBytes = java.util.Base64.getDecoder().decode(clean.trim());
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
        
        try {
            java.util.Map<String, Object> ocrResult = kycVerificationService.extractOcrDetails(documentType, frontBytes, backBytes);
            return ResponseEntity.ok(ocrResult);
        } catch (IllegalArgumentException e) {
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/mfa/setup")
    public ResponseEntity<com.bankledger.account.dto.MfaSetupResponse> setupMfa(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(accountService.setupMfa(userDetails.getUsername()));
    }

    @PostMapping("/mfa/enable")
    public ResponseEntity<java.util.Map<String, String>> enableMfa(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody java.util.Map<String, String> request) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        String code = request.get("code");
        boolean success = accountService.enableMfa(userDetails.getUsername(), code);
        java.util.Map<String, String> response = new java.util.HashMap<>();
        if (success) {
            response.put("status", "SUCCESS");
            response.put("message", "MFA successfully enabled");
            return ResponseEntity.ok(response);
        } else {
            response.put("status", "FAILED");
            response.put("message", "Invalid verification code");
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/pin/setup")
    public ResponseEntity<Void> setupTransactionPin(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody java.util.Map<String, String> request) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        String pin = request.get("pin");
        accountService.setTransactionPin(userDetails.getUsername(), pin);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/pin/verify")
    public ResponseEntity<Boolean> verifyTransactionPin(
            @RequestParam String username,
            @RequestParam String pin) {
        return ResponseEntity.ok(accountService.verifyTransactionPin(username, pin));
    }

    @PostMapping("/pin/forgot-request")
    public ResponseEntity<java.util.Map<String, String>> forgotPinRequest(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            String maskedPhone = accountService.sendOtpForPinReset(userDetails.getUsername());
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "SUCCESS");
            response.put("message", "OTP sent successfully to phone number ending in " + maskedPhone);
            response.put("maskedPhone", maskedPhone);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "FAILED");
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/pin/forgot-reset")
    public ResponseEntity<java.util.Map<String, String>> forgotPinReset(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody java.util.Map<String, String> request) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        
        String otp = request.get("otp");
        String newPin = request.get("newPin");
        
        try {
            accountService.resetPinWithOtp(userDetails.getUsername(), otp, newPin);
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "SUCCESS");
            response.put("message", "Transaction PIN has been reset successfully.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "FAILED");
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/password/forgot-request")
    public ResponseEntity<java.util.Map<String, String>> forgotPasswordRequest(
            @RequestBody java.util.Map<String, String> request) {
        String username = request.get("username");
        String aadhaarId = request.get("aadhaarId");
        
        if (username == null || username.trim().isEmpty()) {
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "FAILED");
            response.put("message", "Username is required.");
            return ResponseEntity.badRequest().body(response);
        }
        if (aadhaarId == null || aadhaarId.trim().isEmpty()) {
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "FAILED");
            response.put("message", "Aadhaar ID number is required.");
            return ResponseEntity.badRequest().body(response);
        }
        
        try {
            // Find User ID by username
            com.bankledger.account.model.User user = userRepository.findByUsername(username.trim())
                    .orElseThrow(() -> new IllegalArgumentException("Username not found."));
            
            // Retrieve latest KYC verification
            java.util.Optional<com.bankledger.account.model.KYCVerification> verificationOpt = 
                    kycVerificationRepository.findTopByUserIdOrderBySubmittedAtDesc(user.getId());
            
            if (verificationOpt.isEmpty() || verificationOpt.get().getDocumentNumber() == null) {
                java.util.Map<String, String> response = new java.util.HashMap<>();
                response.put("status", "FAILED");
                response.put("message", "Aadhaar ID does not match our records or KYC verification not found.");
                return ResponseEntity.badRequest().body(response);
            }

            String cleanAadhaar = aadhaarId.replaceAll("[^0-9]", "");
            String cleanDbDoc = verificationOpt.get().getDocumentNumber().replaceAll("[^0-9]", "");
            
            if (cleanAadhaar.isEmpty() || !cleanDbDoc.equals(cleanAadhaar)) {
                java.util.Map<String, String> response = new java.util.HashMap<>();
                response.put("status", "FAILED");
                response.put("message", "Aadhaar ID does not match the record on file.");
                return ResponseEntity.badRequest().body(response);
            }

            String maskedPhone = accountService.sendOtpForPasswordReset(username.trim());
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "SUCCESS");
            response.put("message", "OTP sent successfully to phone number ending in " + maskedPhone);
            response.put("maskedPhone", maskedPhone);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "FAILED");
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/password/forgot-reset")
    public ResponseEntity<java.util.Map<String, String>> forgotPasswordReset(
            @RequestBody java.util.Map<String, String> request) {
        String username = request.get("username");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");
        
        if (username == null || username.trim().isEmpty() ||
            otp == null || otp.trim().isEmpty() ||
            newPassword == null || newPassword.trim().isEmpty()) {
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "FAILED");
            response.put("message", "Username, OTP, and new password are required.");
            return ResponseEntity.badRequest().body(response);
        }
        
        try {
            accountService.resetPasswordWithOtp(username.trim(), otp.trim(), newPassword);
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "SUCCESS");
            response.put("message", "Password has been reset successfully.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "FAILED");
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @Autowired
    private com.bankledger.account.repository.KYCVerificationRepository kycVerificationRepository;

    @Autowired
    private com.bankledger.account.repository.KYCAuditLogRepository kycAuditLogRepository;

    @Autowired
    private com.bankledger.account.repository.UserRepository userRepository;

    @GetMapping("/referred-users")
    public ResponseEntity<java.util.List<java.util.Map<String, String>>> getReferredUsers(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null || userDetails.getAccountId() == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        
        java.util.List<com.bankledger.account.model.User> referredUsers = 
                userRepository.findByReferredBy(userDetails.getAccountId().toString());
                
        java.util.List<java.util.Map<String, String>> result = new java.util.ArrayList<>();
        for (com.bankledger.account.model.User user : referredUsers) {
            java.util.Map<String, String> map = new java.util.HashMap<>();
            map.put("username", user.getUsername());
            map.put("fullName", user.getAccount() != null ? user.getAccount().getFullName() : "User");
            map.put("kycStatus", user.getKycStatus());
            map.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : "");
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/kyc/status")
    public ResponseEntity<java.util.Map<String, Object>> getKycStatusDetails(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        java.util.Optional<com.bankledger.account.model.KYCVerification> verificationOpt = 
                kycVerificationRepository.findTopByUserIdOrderBySubmittedAtDesc(userDetails.getAccountId());
        
        if (verificationOpt.isPresent()) {
            com.bankledger.account.model.KYCVerification verification = verificationOpt.get();
            response.put("kycId", verification.getKycId());
            response.put("status", verification.getStatus());
            response.put("faceMatchScore", verification.getFaceMatchScore());
            response.put("ocrConfidence", verification.getOcrConfidence());
            response.put("riskScore", verification.getRiskScore());
            response.put("rejectionReason", verification.getRejectionReason());
            response.put("submittedAt", verification.getSubmittedAt());
            response.put("verifiedAt", verification.getVerifiedAt());
            response.put("documentType", verification.getDocumentType());
            response.put("documentNumber", verification.getDocumentNumber());
        } else {
            response.put("status", "NOT_STARTED");
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/kyc/logs")
    public ResponseEntity<java.util.List<com.bankledger.account.model.KYCAuditLog>> getKycAuditLogs(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(kycAuditLogRepository.findByUserIdOrderByCreatedAtDesc(userDetails.getAccountId()));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMyAccount(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null || userDetails.getAccountId() == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        accountService.deleteAccount(userDetails.getAccountId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<com.bankledger.account.dto.AccountResponse> getAccountByUsername(@PathVariable String username) {
        return ResponseEntity.ok(accountService.getAccountByUsername(username));
    }
}
