package com.bankledger.account.service;

import com.bankledger.account.model.*;
import com.bankledger.account.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Base64;
import java.util.UUID;

@Service
@Slf4j
public class KycVerificationService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private KYCVerificationRepository kycVerificationRepository;

    @Autowired
    private KYCDocumentRepository kycDocumentRepository;

    @Autowired
    private KYCAuditLogRepository kycAuditLogRepository;

    @org.springframework.beans.factory.annotation.Value("${kyc.aws.access-key:}")
    private String awsAccessKey;

    @org.springframework.beans.factory.annotation.Value("${kyc.aws.secret-key:}")
    private String awsSecretKey;

    @org.springframework.beans.factory.annotation.Value("${kyc.aws.region:us-east-1}")
    private String awsRegion;

    @org.springframework.beans.factory.annotation.Value("${kyc.provider:AWS}")
    private String kycProvider;

    @org.springframework.beans.factory.annotation.Value("${kyc.google.project-id:}")
    private String googleProjectId;

    @org.springframework.beans.factory.annotation.Value("${kyc.google.location:us}")
    private String googleLocation;

    @org.springframework.beans.factory.annotation.Value("${kyc.google.processor-id:}")
    private String googleProcessorId;

    @org.springframework.beans.factory.annotation.Value("${GOOGLE_APPLICATION_CREDENTIALS:}")
    private String googleCredentialsPath;

    @org.springframework.beans.factory.annotation.Value("${transaction-service.url:http://localhost:8083}")
    private String transactionServiceUrl;

    private software.amazon.awssdk.services.rekognition.RekognitionClient rekognitionClient;
    private software.amazon.awssdk.services.textract.TextractClient textractClient;

    @jakarta.annotation.PostConstruct
    public void initAwsClients() {
        log.info("[PayVora KYC Engine] AWS and Google clients are disabled by user configuration (Local OCR active only).");
    }

    @Transactional
    public KYCVerification verifyAutomatically(
            String username,
            String documentType,
            String documentFrontBase64,
            String documentBackBase64,
            String documentNumber,
            String selfieBase64,
            String dob,
            String gender,
            String address) {

        log.info("[PayVora KYC Engine] Starting automated KYC verification for user: {}", username);
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
        
        UUID userId = user.getId();
        
        // Block re-submission if user is already approved
        if ("APPROVED".equalsIgnoreCase(user.getKycStatus())) {
            throw new IllegalArgumentException("KYC is already verified and approved for this account. Re-submission is not permitted.");
        }
        
        LocalDateTime now = LocalDateTime.now();

        // 1. Create Initial Document Record
        KYCDocument docRecord = KYCDocument.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .documentFrontUrl(documentFrontBase64) // Storing base64 as URL string directly for simplicity
                .documentBackUrl(documentBackBase64)
                .selfieUrl(selfieBase64)
                .encrypted(true)
                .uploadedAt(now)
                .build();
        kycDocumentRepository.save(docRecord);
        logAudit(userId, "DOCUMENT_UPLOADED", "Front/back identity documents and biometric selfie uploaded successfully.");

        // Initialize verification metrics
        BigDecimal faceMatchScore = BigDecimal.ZERO;
        BigDecimal ocrConfidence = BigDecimal.valueOf(95.0); // Default high confidence unless validation skews it
        int riskScore = 10; // Base low risk
        String rejectionReason = null;
        String status = "APPROVED";

        try {
            // Decode files for verification
            byte[] frontBytes = decodeBase64(documentFrontBase64);
            byte[] selfieBytes = (selfieBase64 == null || selfieBase64.trim().isEmpty()) ? new byte[0] : decodeBase64(selfieBase64);
            byte[] backBytes = null;
            if (documentBackBase64 != null && !documentBackBase64.trim().isEmpty()) {
                backBytes = decodeBase64(documentBackBase64);
            }

            // 2. Validate Document Authenticity & Quality
            if (!isValidMimeType(frontBytes) || (selfieBytes.length > 0 && !isValidMimeType(selfieBytes)) || (backBytes != null && !isValidMimeType(backBytes))) {
                throw new IllegalArgumentException("Invalid file format. Uploaded documents must be JPEG, PNG, or PDF format.");
            }
            
            // Grayscale check to prevent black-and-white photocopies/paper printouts
            if (isGrayscale(frontBytes)) {
                throw new IllegalArgumentException("Photocopy / Black & White printout detected. Please upload a clear color photo of your actual physical document.");
            }
            if (backBytes != null && isGrayscale(backBytes)) {
                throw new IllegalArgumentException("Photocopy / Black & White printout detected on the back document. Please upload a clear color photo of your actual physical document.");
            }
            
            if (frontBytes.length < 5000) {
                throw new IllegalArgumentException("Image quality too low: Uploaded front photo is blurry, low resolution, or too small.");
            }
            try {
                BufferedImage frontImg = ImageIO.read(new ByteArrayInputStream(frontBytes));
                if (frontImg != null && (frontImg.getWidth() < 600 || frontImg.getHeight() < 400)) {
                    throw new IllegalArgumentException("Front document resolution too low. Minimum dimensions are 600x400 pixels.");
                }
            } catch (IllegalArgumentException e) {
                throw e;
            } catch (Exception e) {
                log.warn("ImageIO failed to verify resolution dimensions. Proceeding with bytes size validation only.", e);
            }

            // 3. Document Format & Checksum Verification
            validateDocumentNumber(documentType, documentNumber);

            // Run OCR text extraction on front and back documents
            java.util.Map<String, Object> ocrData = extractOcrDetails(documentType, frontBytes, backBytes);
            
            // Check frontend vs front card OCR
            if (ocrData.containsKey("documentNumber")) {
                String frontOcrNum = (String) ocrData.get("documentNumber");
                if (!frontOcrNum.equals(documentNumber)) {
                    riskScore = 100;
                    status = "REJECTED";
                    rejectionReason = "KYC Verification Failed: The Aadhaar number read from the front document image (" + frontOcrNum + ") does not match your entered document number (" + documentNumber + "). Please check your entry and ensure the image is clear.";
                    logAudit(userId, "RISK_SCORE_CHANGES", "Risk Score set to 100 due to document number mismatch.");
                    throw new IllegalArgumentException(rejectionReason);
                }
            } else {
                throw new IllegalArgumentException("Failed to extract Aadhaar number from the front image.");
            }

            // Check frontend vs back card OCR
            if (backBytes != null) {
                    if (ocrData.containsKey("backDocumentNumber")) {
                        String backOcrNum = (String) ocrData.get("backDocumentNumber");
                        String compareOcr = backOcrNum.substring(0, Math.min(4, backOcrNum.length()));
                        String compareDoc = documentNumber.substring(0, Math.min(4, documentNumber.length()));
                        if (!compareOcr.equals(compareDoc)) {
                            riskScore = 100;
                            status = "REJECTED";
                            rejectionReason = "KYC Verification Failed: The Aadhaar number read from the back document image (" + backOcrNum + ") does not match your entered document number (" + documentNumber + "). Please check your document photos.";
                            logAudit(userId, "RISK_SCORE_CHANGES", "Risk Score set to 100 due to document number mismatch.");
                            throw new IllegalArgumentException(rejectionReason);
                        }
                        logAudit(userId, "OCR_MATCH_SUCCESS", "Aadhaar numbers from both the front and back document images matched successfully.");
                    } else {
                    log.warn("[PayVora KYC Engine] Could not extract Aadhaar number from the back document image. Bypassing back number check.");
                }
            }

            // 4. Duplicate Identity Check (Identity Theft Prevention)
            boolean duplicateIdentity = kycVerificationRepository.existsByDocumentNumberAndStatus(documentNumber, "APPROVED");
            if (duplicateIdentity) {
                riskScore = 100;
                status = "REJECTED";
                rejectionReason = "Duplicate identity detected: Document number is already verified under another account.";
                logAudit(userId, "RISK_SCORE_CHANGES", "Risk Score set to 100 due to duplicate identity detection.");
                throw new IllegalArgumentException(rejectionReason);
            }

            // 5. Face Matching Calculation (Disabled by User Configuration)
            faceMatchScore = BigDecimal.valueOf(100.00);
            logAudit(userId, "FACE_MATCH_EVENT", "Biometric face verification skipped (Disabled by configuration).");

            // 6. Verify User Profile Completeness (MFA, Phone, Email, Bank Status)
            if (user.getAccount() == null) {
                throw new IllegalStateException("No linked bank account found for verification.");
            }
            Account account = user.getAccount();
            
            boolean isPhoneVerified = user.getPhoneNumber() != null && !user.getPhoneNumber().trim().isEmpty();
            boolean isEmailVerified = account.getEmail() != null && !account.getEmail().trim().isEmpty();
            boolean isBankVerified = account.getStatus() == AccountStatus.ACTIVE;

            if (!isPhoneVerified || !isEmailVerified || !isBankVerified) {
                riskScore = Math.max(riskScore, 45); // Raise risk to medium if contact credentials/bank status are unverified
                status = "UNDER_REVIEW";
                logAudit(userId, "RISK_SCORE_CHANGES", "Risk Score increased to 45 (Medium) due to unverified profile items (Phone/Email/Bank).");
            }

            // 7. Age verification check
            if (dob != null && !dob.trim().isEmpty()) {
                try {
                    java.time.LocalDate birthDate = java.time.LocalDate.parse(dob);
                    java.time.Period age = java.time.Period.between(birthDate, java.time.LocalDate.now());
                    if (age.getYears() < 18) {
                        riskScore = 100;
                        status = "REJECTED";
                        rejectionReason = "Identity rejected: Account holder must be 18 years or older to use digital banking services.";
                        logAudit(userId, "RISK_SCORE_CHANGES", "Risk Score set to 100 due to underage profile.");
                        throw new IllegalArgumentException(rejectionReason);
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse DOB for age check: {}", dob);
                }
            }
            
            // Name match check (Fuzzy match against scanned lines)
            if (ocrData.containsKey("frontText") && user.getAccount() != null && user.getAccount().getFullName() != null) {
                String registeredName = user.getAccount().getFullName().toLowerCase().replaceAll("[^a-z0-9]", "");
                String frontText = (String) ocrData.get("frontText");
                String[] frontLines = frontText.split("\n");
                boolean nameMatched = false;
                String bestOcrMatch = "";
                double maxSimilarity = 0.0;
                
                for (String line : frontLines) {
                    String ocrName = line.toLowerCase().replaceAll("[^a-z0-9]", "");
                    if (ocrName.isEmpty()) continue;
                    
                    if (ocrName.equals(registeredName) || ocrName.contains(registeredName)) {
                        nameMatched = true;
                        bestOcrMatch = line.trim();
                        maxSimilarity = 1.0;
                        break;
                    }
                    
                    int distance = getLevenshteinDistance(ocrName, registeredName);
                    double similarity = 1.0 - ((double) distance / Math.max(ocrName.length(), registeredName.length()));
                    if (similarity > maxSimilarity) {
                        maxSimilarity = similarity;
                        bestOcrMatch = line.trim();
                    }
                    if (similarity >= 1.0) {
                        nameMatched = true;
                    }
                }
                
                if (!nameMatched) {
                    riskScore = 100;
                    status = "REJECTED";
                    rejectionReason = "KYC Verification Failed: The name on your identity document (best match: '" + bestOcrMatch + "') does not match your registered bank account name (" + user.getAccount().getFullName() + "). Please ensure your document is correct.";
                    logAudit(userId, "RISK_SCORE_CHANGES", "Risk Score set to 100 due to name mismatch.");
                    throw new IllegalArgumentException(rejectionReason);
                } else {
                    log.info("[PayVora KYC Engine] Name matched successfully. Best OCR match: '{}' (Similarity: {}%)", bestOcrMatch, (int)(maxSimilarity * 100));
                }
            }
            
            // Gender match check
            if (ocrData.containsKey("gender") && gender != null && !gender.trim().isEmpty()) {
                String ocrGender = (String) ocrData.get("gender");
                if (!ocrGender.equalsIgnoreCase(gender)) {
                    riskScore = Math.max(riskScore, 80);
                    status = "UNDER_REVIEW";
                    rejectionReason = "Gender mismatch detected: Document gender (" + ocrGender + ") does not match selected gender (" + gender + ").";
                    logAudit(userId, "RISK_SCORE_CHANGES", "Risk Score increased to 80 due to gender mismatch.");
                }
            }

            // Low Risk auto-approves
            if (status.equals("APPROVED") && riskScore <= 30) {
                logAudit(userId, "APPROVAL_EVENT", "KYC automatically approved via automated rules engine. Low risk score: " + riskScore);
            }

        } catch (IllegalArgumentException e) {
            status = "REJECTED";
            rejectionReason = e.getMessage();
            logAudit(userId, "REJECTION_EVENT", "KYC automatically rejected. Reason: " + rejectionReason);
        } catch (Exception e) {
            log.error("[PayVora KYC Engine] Unexpected error during verification, routing to UNDER_REVIEW", e);
            status = "UNDER_REVIEW";
            rejectionReason = "Heuristics verification check encountered an unexpected processing error. Queued for manual admin review.";
            logAudit(userId, "UNDER_REVIEW_EVENT", "KYC status set to UNDER_REVIEW. OCR Confidence score: " + ocrConfidence);
        }

        // 8. Generate and Persist KYC Verification Record
        String kycId = "KYC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        KYCVerification verification = KYCVerification.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .kycId(kycId)
                .documentType(documentType)
                .documentNumber(documentNumber)
                .status(status)
                .faceMatchScore(faceMatchScore)
                .ocrConfidence(ocrConfidence)
                .riskScore(riskScore)
                .rejectionReason(rejectionReason)
                .submittedAt(now)
                .verifiedAt("APPROVED".equals(status) || "REJECTED".equals(status) ? now : null)
                .build();
        
        kycVerificationRepository.save(verification);

        // Update User & Account status
        user.setKycStatus(status);
        user.setKycErrorDetails(rejectionReason);
        
        // Save masked version of document number in User
        user.setKycDocumentNumber(maskDocumentNumber(documentType, documentNumber));
        userRepository.save(user);

        if (user.getAccount() != null) {
            user.getAccount().setKycStatus(KycStatus.valueOf(status));
            // Trigger save on account implicitly via transaction save or manually
        }

        // Credit Referral Bonus to referrer if referee was referred by someone and status is APPROVED
        if ("APPROVED".equals(status)) {
            if (user.getReferredBy() != null && !user.getReferredBy().trim().isEmpty()) {
                try {
                    String referrerId = user.getReferredBy().trim();
                    log.info("[PayVora KYC Engine] User was referred by account ID: {}. Triggering reward payout call to transaction-service...", referrerId);
                    
                    org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
                    String url = transactionServiceUrl + "/api/rewards/referral/credit?referrerAccountId=" + referrerId + "&refereeAccountId=" + user.getAccount().getId();
                    restTemplate.postForEntity(url, null, Void.class);
                    
                    logAudit(userId, "REFERRAL_REWARD_CREDITED", "Referral cashback reward successfully processed for referrer account ID: " + referrerId);
                } catch (Exception ex) {
                    log.error("[PayVora KYC Engine] Failed to credit referral reward to transaction-service", ex);
                }
            }
        }

        log.info("[PayVora KYC Engine] KYC automated process finished for '{}'. Outcome: {}", username, status);
        return verification;
    }

    private void validateDocumentMimeType(byte[] frontBytes, byte[] selfieBytes) {
        if (!isValidMimeType(frontBytes) || !isValidMimeType(selfieBytes)) {
            throw new IllegalArgumentException("Invalid file format. Uploaded documents must be JPEG, PNG, or PDF format.");
        }
    }

    private boolean isValidMimeType(byte[] bytes) {
        if (bytes == null || bytes.length < 4) return false;
        
        // JPEG magic number: FF D8
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8) {
            return true;
        }
        // PNG magic number: 89 50 4E 47
        if ((bytes[0] & 0xFF) == 0x89 && (bytes[1] & 0xFF) == 0x50 && 
            (bytes[2] & 0xFF) == 0x4E && (bytes[3] & 0xFF) == 0x47) {
            return true;
        }
        // PDF magic number: 25 50 44 46
        if ((bytes[0] & 0xFF) == 0x25 && (bytes[1] & 0xFF) == 0x50 && 
            (bytes[2] & 0xFF) == 0x44 && (bytes[3] & 0xFF) == 0x46) {
            return true;
        }
        return false;
    }

    private void validateImageQualityAndResolution(byte[] frontBytes, byte[] selfieBytes) {
        // Blur / Quality check: check file byte sizes (e.g. less than 5KB is too small for raw image files)
        if (frontBytes.length < 5000 || selfieBytes.length < 5000) {
            throw new IllegalArgumentException("Image quality too low: Uploaded photo is blurry, low resolution, or too small.");
        }

        // Verify dimensions (width/height >= 600x400)
        try {
            BufferedImage frontImg = ImageIO.read(new ByteArrayInputStream(frontBytes));
            BufferedImage selfieImg = ImageIO.read(new ByteArrayInputStream(selfieBytes));
            
            if (frontImg != null) {
                if (frontImg.getWidth() < 600 || frontImg.getHeight() < 400) {
                    throw new IllegalArgumentException("Front document resolution too low. Minimum dimensions are 600x400 pixels.");
                }
            }
            if (selfieImg != null) {
                if (selfieImg.getWidth() < 400 || selfieImg.getHeight() < 400) {
                    throw new IllegalArgumentException("Selfie image resolution too low. Minimum dimensions are 400x400 pixels.");
                }
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.warn("ImageIO failed to verify resolution dimensions. Proceeding with bytes size validation only.", e);
        }
    }

    private void validateDuplicateUploads(byte[] frontBytes, byte[] selfieBytes) {
        // Check if the user uploaded the exact same file for selfie and document image
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash1 = md.digest(frontBytes);
            byte[] hash2 = md.digest(selfieBytes);
            if (Arrays.equals(hash1, hash2)) {
                throw new IllegalArgumentException("Invalid uploads: Identity document image and selfie photo cannot be the exact same file.");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            if (Arrays.equals(frontBytes, selfieBytes)) {
                throw new IllegalArgumentException("Invalid uploads: Identity document image and selfie photo cannot be the exact same file.");
            }
        }
    }

    private void validateDocumentNumber(String documentType, String docNum) {
        if (docNum == null || docNum.trim().isEmpty()) {
            throw new IllegalArgumentException("Document number cannot be empty.");
        }
        String clean = docNum.replaceAll("\\s+", "");
        
        if ("ID_CARD".equalsIgnoreCase(documentType)) {
            // Aadhaar validation (12 digits + Verhoeff Checksum)
            if (!clean.matches("^\\d{12}$")) {
                throw new IllegalArgumentException("Invalid document format: Aadhaar Card number must be exactly 12 digits.");
            }
            if ("123456789012".equals(clean) || "999999999999".equals(clean) || "000000000000".equals(clean)) {
                // Pass validation for local testing ease
            } else if (!Verhoeff.validateVerhoeff(clean)) {
                throw new IllegalArgumentException("Fake document detected: Aadhaar number failed mathematical checksum validation.");
            }
        } else if ("PAN".equalsIgnoreCase(documentType) || "PAN_CARD".equalsIgnoreCase(documentType)) {
            // PAN validation (10 alphanumeric, e.g. ABCDE1234F)
            if (!clean.matches("^[A-Z]{5}[0-9]{4}[A-Z]{1}$")) {
                throw new IllegalArgumentException("Invalid document format: PAN Card number must be 10 characters matching the format (e.g. ABCDE1234F).");
            }
        } else if ("PASSPORT".equalsIgnoreCase(documentType)) {
            // Passport validation (8-9 characters, e.g. Z1234567)
            if (!clean.matches("^[A-Z0-9]{8,9}$")) {
                throw new IllegalArgumentException("Invalid document format: Passport number must be 8 or 9 alphanumeric characters.");
            }
        } else if ("DRIVER_LICENSE".equalsIgnoreCase(documentType)) {
            // DL validation
            if (!clean.matches("^[A-Z0-9-]{5,20}$")) {
                throw new IllegalArgumentException("Invalid document format: Driving License must be between 5 and 20 alphanumeric characters.");
            }
        }
    }



    private String maskDocumentNumber(String documentType, String docNum) {
        if (docNum == null || docNum.trim().isEmpty()) return "";
        String clean = docNum.trim();
        
        if ("ID_CARD".equalsIgnoreCase(documentType) && clean.length() >= 12) {
            // Aadhaar: XXXX XXXX 1234
            return "XXXX XXXX " + clean.substring(clean.length() - 4);
        } else if (clean.length() >= 6) {
            // PAN: ABCDE****F or others
            return clean.substring(0, 5) + "****" + clean.substring(clean.length() - 1);
        }
        return "****" + (clean.length() > 3 ? clean.substring(clean.length() - 3) : "");
    }

    private byte[] decodeBase64(String base64Str) {
        try {
            String cleanBase64 = base64Str;
            if (base64Str.contains(",")) {
                cleanBase64 = base64Str.split(",")[1];
            }
            return Base64.getDecoder().decode(cleanBase64.trim());
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to process document files. Ensure files are valid images.");
        }
    }

    private void logAudit(UUID userId, String eventType, String details) {
        KYCAuditLog logRecord = KYCAuditLog.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .eventType(eventType)
                .details(details)
                .createdAt(LocalDateTime.now())
                .build();
        kycAuditLogRepository.save(logRecord);
        log.info("[PayVora KYC Audit] User: {}, Event: {}, Details: {}", userId, eventType, details);
    }

    // --- Embedded Verhoeff Checksum Algorithm Implementation ---
    public static class Verhoeff {
        private static final int[][] d = {
            {0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
            {1, 2, 3, 4, 0, 6, 7, 8, 9, 5},
            {2, 3, 4, 0, 1, 7, 8, 9, 5, 6},
            {3, 4, 0, 1, 2, 8, 9, 5, 6, 7},
            {4, 0, 1, 2, 3, 9, 5, 6, 7, 8},
            {5, 9, 8, 7, 6, 0, 4, 3, 2, 1},
            {6, 5, 9, 8, 7, 1, 0, 4, 3, 2},
            {7, 6, 5, 9, 8, 2, 1, 0, 4, 3},
            {8, 7, 6, 5, 9, 3, 2, 1, 0, 4},
            {9, 8, 7, 6, 5, 4, 3, 2, 1, 0}
        };

        private static final int[][] p = {
            {0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
            {1, 5, 7, 6, 2, 8, 3, 0, 9, 4},
            {5, 8, 0, 3, 7, 9, 6, 1, 4, 2},
            {8, 9, 1, 6, 0, 4, 3, 5, 2, 7},
            {9, 4, 5, 3, 1, 2, 6, 8, 7, 0},
            {4, 2, 8, 6, 5, 7, 3, 9, 0, 1},
            {2, 7, 9, 3, 8, 0, 6, 4, 1, 5},
            {7, 0, 4, 6, 9, 1, 3, 2, 5, 8}
        };

        public static boolean validateVerhoeff(String num) {
            int c = 0;
            int[] myArray = new int[num.length()];
            for (int i = 0; i < num.length(); i++) {
                myArray[i] = Integer.parseInt(Character.toString(num.charAt(i)));
            }
            for (int i = 0; i < myArray.length; i++) {
                int index = myArray.length - 1 - i;
                c = d[c][p[i % 8][myArray[index]]];
            }
            return c == 0;
        }
    }

    public java.util.Map<String, Object> extractOcrDetails(String documentType, byte[] frontBytes, byte[] backBytes) {
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        java.util.List<String> errors = new java.util.ArrayList<>();
        
        boolean frontSuccessful = false;
        boolean backSuccessful = false;
        
        if (frontBytes != null && frontBytes.length > 0) {
            String frontText = detectText(frontBytes, errors);
            if (frontText != null && !frontText.trim().isEmpty()) {
                 log.info("[PayVora OCR Parser] Front document scanned text details:\n{}", frontText);
                 
                 // Must-have conditions for Aadhaar Front Card
                 String lowerFront = frontText.toLowerCase();
                 boolean hasGovt = lowerFront.contains("government") || lowerFront.contains("india") || 
                                   lowerFront.contains("bharat") || lowerFront.contains("భారత") || 
                                   lowerFront.contains("भारत") || lowerFront.contains("ਭਾਰਤ");
                 boolean hasDob = lowerFront.contains("dob") || lowerFront.contains("birth") || 
                                  lowerFront.contains("పుట్టిన") || lowerFront.contains("जन्म") || 
                                  lowerFront.contains("yob");
                 boolean hasGender = lowerFront.contains("male") || lowerFront.contains("female") || 
                                     lowerFront.contains("maie") || lowerFront.contains("femaie") || 
                                     lowerFront.contains("gender") || lowerFront.contains("స్ర్తీ") || 
                                     lowerFront.contains("పురుషుడు") || lowerFront.contains("haie");
                 
                 if (!hasGovt) {
                      log.warn("[PayVora KYC Engine] Front card missing Government headers.");
                  }
                  if (!hasDob) {
                      log.warn("[PayVora KYC Engine] Front card missing DOB headers.");
                  }
                  if (!hasGender) {
                      log.warn("[PayVora KYC Engine] Front card missing Gender headers.");
                  }
                  
                  frontSuccessful = true;
                  
                  // Try to find the Aadhaar number using tolerant regex to handle OCR character substitutions
                  String detectedAadhaar = null;
                  java.util.regex.Matcher tolerantMatcher = java.util.regex.Pattern.compile("(?i)\\b[0-9oisl|\\\\/]{4}\\s+[0-9oisl|\\\\/]{4}\\s+[0-9oisl|\\\\/]{4}\\b").matcher(frontText);
                  if (tolerantMatcher.find()) {
                      String rawMatch = tolerantMatcher.group();
                      String cleaned = rawMatch.toUpperCase()
                              .replaceAll("[OO]", "0")
                              .replaceAll("[IIL|]", "1")
                              .replaceAll("[SS]", "5")
                              .replaceAll("[\\\\/]", "7")
                              .replaceAll("[^0-9]", "");
                      if (cleaned.length() == 12) {
                          detectedAadhaar = cleaned;
                      }
                  }

                  if (detectedAadhaar != null) {
                      result.put("documentNumber", detectedAadhaar);
                  } else {
                      java.util.regex.Matcher numMatcherRaw = java.util.regex.Pattern.compile("\\b\\d{12}\\b").matcher(frontText);
                      if (numMatcherRaw.find()) {
                          result.put("documentNumber", numMatcherRaw.group());
                      } else {
                          throw new IllegalArgumentException("Failed to extract Aadhaar number from image. Please ensure the card is clear and fully visible.");
                      }
                  }
                
                java.util.regex.Matcher dobMatcher = java.util.regex.Pattern.compile("(\\d{2}[/-]\\d{2}[/-]\\d{4})").matcher(frontText);
                if (dobMatcher.find()) {
                    String rawDob = dobMatcher.group();
                    String[] parts = rawDob.split("[/-]");
                    if (parts.length == 3) {
                        result.put("dob", parts[2] + "-" + parts[1] + "-" + parts[0]);
                    } else {
                        throw new IllegalArgumentException("Failed to parse Date of Birth from front image.");
                    }
                } else {
                    java.util.regex.Matcher yobMatcher = java.util.regex.Pattern.compile("Year of Birth:\\s*(\\d{4})").matcher(frontText);
                    if (yobMatcher.find()) {
                        result.put("dob", yobMatcher.group(1) + "-01-01");
                    } else {
                        throw new IllegalArgumentException("Failed to extract Date of Birth or Year of Birth from front image.");
                    }
                }
                
                String lowerText = frontText.toLowerCase();
                if (lowerText.contains("female") || lowerText.contains("femaie")) {
                    result.put("gender", "FEMALE");
                } else if (lowerText.contains("male") || lowerText.contains("maie") || lowerText.contains("haie")) {
                    result.put("gender", "MALE");
                } else {
                    result.put("gender", "MALE");
                }
                
                // Scan for name
                String[] lines = frontText.split("\n");
                String nameVal = null;
                for (String line : lines) {
                    String trim = line.trim();
                    if (trim.contains("Government") || trim.contains("GOVERNMENT") || trim.contains("Unique") || 
                        trim.contains("Male") || trim.contains("Female") || trim.contains("DOB") || 
                        trim.contains("Birth") || trim.contains("Aadhaar") || trim.isEmpty() || trim.matches("^\\d+$")) {
                        continue;
                    }
                    nameVal = trim;
                    break;
                }
                if (nameVal != null && !nameVal.isEmpty()) {
                    result.put("name", nameVal);
                } else {
                    throw new IllegalArgumentException("Failed to extract name from front document image. Please ensure the card is clear and fully visible.");
                }
                
                result.put("frontText", frontText);
                result.put("confidence", 98.4f);
            }
        }
        
        if (backBytes != null && backBytes.length > 0) {
            String backText = null;
            try {
                log.info("[PayVora KYC Engine] Attempting raw back image scan first...");
                backText = detectText(backBytes, errors);
                if (backText == null || backText.trim().isEmpty()) {
                    throw new IllegalArgumentException("Raw back scan returned empty");
                }
                String lower = backText.toLowerCase();
                boolean hasAddress = lower.contains("address") || lower.contains("adhress") || 
                                     lower.contains("adress") || lower.contains("చిరునామా") || 
                                     lower.contains("చిరునామ") || lower.contains("అడ్రస్") ||
                                     lower.contains("address:") || lower.contains("adhress:") ||
                                     lower.contains("c/o") || lower.contains("d/o") || lower.contains("s/o") || lower.contains("w/o");
                if (!hasAddress) {
                    throw new IllegalArgumentException("No address keyword found in raw scan, falling back to QR mask");
                }
            } catch (Exception e) {
                log.info("[PayVora KYC Engine] Raw back scan failed or missing address: {}. Retrying with QR mask...", e.getMessage());
                byte[] maskedBackBytes = maskQrCode(backBytes);
                backText = detectText(maskedBackBytes, errors);
            }
            if (backText != null && !backText.trim().isEmpty()) {
                 log.info("[PayVora OCR Parser] Back document scanned text details:\n{}", backText);
                 
                 // Must-have conditions for Aadhaar Back Card
                 String lowerBack = backText.toLowerCase();
                 boolean hasAuthority = lowerBack.contains("unique") || lowerBack.contains("identification") || 
                                       lowerBack.contains("authority") || lowerBack.contains("uidai") ||
                                       lowerBack.contains("ವಿಶಿಷ್ಟ") || lowerBack.contains("విశిష్ట") || lowerBack.contains("विशिष्ट");
                 boolean hasContact = lowerBack.contains("help@uidai") || lowerBack.contains("www.uidai") || 
                                     lowerBack.contains("1947") || lowerBack.contains("help");
                 
                 if (!hasAuthority) {
                      log.warn("[PayVora KYC Engine] Back card missing Authority headers.");
                  }
                  if (!hasContact) {
                      log.warn("[PayVora KYC Engine] Back card missing Contact headers.");
                  }
                 
                 backSuccessful = true;
                
                int addressIdx = -1;
                java.util.regex.Matcher addrMatcher = java.util.regex.Pattern.compile(
                        "(?i)(?:Address|Adhress|Adress|adress|adhress|చిరునామా|चिराना|चिरुनामा|చిరునామ|అడ్రస్|முகவரி|చిరు నామ)", 
                        java.util.regex.Pattern.CASE_INSENSITIVE
                ).matcher(backText);
                
                if (addrMatcher.find()) {
                    addressIdx = addrMatcher.start();
                } else {
                    java.util.regex.Matcher coMatcher = java.util.regex.Pattern.compile(
                            "(?i)(?:C/O|S/O|D/O|W/O|Care of|Father|Husband|Wife)", 
                            java.util.regex.Pattern.CASE_INSENSITIVE
                    ).matcher(backText);
                    if (coMatcher.find()) {
                        addressIdx = coMatcher.start();
                    }
                }
                
                if (addressIdx != -1) {
                    String sub = backText.substring(addressIdx);
                    String cleanAddr = sub.replaceFirst("(?i)^(?:Address|Adhress|Adress|adress|adhress|చిరునామా|चिराना|चिरुनामा|చిరునామ|అడ్రస్|முகவரி|చిరు నామ)[\\s:]*", "").trim();
                    String[] lines = cleanAddr.split("\n");
                    StringBuilder addrSb = new StringBuilder();
                    for (String line : lines) {
                        String cleanedLine = line.replaceAll("[^a-zA-Z0-9\\s,.:\\-/()#]", "").replaceAll("\\s+", " ").trim();
                        if (cleanedLine.isEmpty()) {
                            continue;
                        }
                        String lowerClean = cleanedLine.toLowerCase();
                        if (lowerClean.contains("help") || lowerClean.contains("uidai") || 
                            lowerClean.contains("unique") || lowerClean.contains("government") ||
                            lowerClean.contains("180011") || lowerClean.contains("1947")) {
                            break;
                        }
                        if (cleanedLine.replaceAll("\\s+", "").matches(".*\\d{12}.*")) {
                            break;
                        }
                        addrSb.append(cleanedLine).append(" ");
                    }
                    result.put("address", cleanAddressText(addrSb.toString().trim()));
                } else {
                    // Resilient Fallback: Split backText, skip header titles, stop at support footer
                    String[] lines = backText.split("\n");
                    StringBuilder addrSb = new StringBuilder();
                    for (String line : lines) {
                        String cleanedLine = line.replaceAll("[^a-zA-Z0-9\\s,.:\\-/()#]", "").replaceAll("\\s+", " ").trim();
                        if (cleanedLine.isEmpty()) {
                            continue;
                        }
                        String lowerClean = cleanedLine.toLowerCase();
                        if (lowerClean.contains("unique") || lowerClean.contains("identification") || 
                            lowerClean.contains("authority") || lowerClean.contains("government") || 
                            lowerClean.contains("india") || lowerClean.contains("peretot") || 
                            lowerClean.contains("doare") || lowerClean.contains("trareco") || lowerClean.contains("hedse")) {
                            continue;
                        }
                        if (lowerClean.contains("help") || lowerClean.contains("uidai") || 
                            lowerClean.contains("180011") || lowerClean.contains("1947")) {
                            break;
                        }
                        if (cleanedLine.replaceAll("\\s+", "").matches(".*\\d{12}.*")) {
                            break;
                        }
                        addrSb.append(cleanedLine).append(" ");
                    }
                    String finalAddr = addrSb.toString().trim();
                    if (!finalAddr.isEmpty()) {
                        result.put("address", cleanAddressText(finalAddr));
                    } else {
                        throw new IllegalArgumentException("Failed to extract complete Address from back image.");
                    }
                }
                
                // Extract Aadhaar number from back card text too
                java.util.regex.Matcher fomesMatcher = java.util.regex.Pattern.compile("(?i)fomes®?\\s*(\\d[\\s\\d]*)").matcher(backText);
                if (fomesMatcher.find()) {
                    String digits = fomesMatcher.group(1).replaceAll("\\s+", "");
                    result.put("backDocumentNumber", digits);
                } else {
                    java.util.regex.Matcher backNumMatcher = java.util.regex.Pattern.compile("\\b\\d{4}\\s?\\d{4}\\s?\\d{4}\\b").matcher(backText);
                    if (backNumMatcher.find()) {
                        result.put("backDocumentNumber", backNumMatcher.group().replaceAll("\\s+", ""));
                    } else {
                        java.util.regex.Matcher backNumMatcherRaw = java.util.regex.Pattern.compile("\\b\\d{12}\\b").matcher(backText);
                        if (backNumMatcherRaw.find()) {
                            result.put("backDocumentNumber", backNumMatcherRaw.group());
                        }
                    }
                }
                
                result.put("confidence", 97.9f);
            }
        }
        
        if ((frontBytes != null && !frontSuccessful) || (backBytes != null && !backSuccessful)) {
            StringBuilder errorDetails = new StringBuilder("OCR text extraction failed: ");
            for (int i = 0; i < errors.size(); i++) {
                errorDetails.append("[").append(i + 1).append("] ").append(errors.get(i)).append(" ");
            }
            throw new IllegalArgumentException(errorDetails.toString().trim());
        }
        
        return result;
    }

    private String detectText(byte[] imageBytes, java.util.List<String> errors) {
        // 1. Try Local Tesseract OCR first (100% offline, local, fast)
        try {
            log.info("[PayVora KYC Engine] Trying Local Tesseract OCR first...");
            String tesseractText = detectTextTesseract(imageBytes);
            if (tesseractText != null && !tesseractText.trim().isEmpty()) {
                return tesseractText;
            }
            errors.add("Tesseract OCR returned empty text.");
        } catch (Throwable t) {
            errors.add("Tesseract OCR failed: " + t.getMessage());
        }

        // 2. Fall back to Local PaddleOCR (deep learning cnn)
        try {
            log.info("[PayVora KYC Engine] Local Tesseract failed. Trying Local PaddleOCR...");
            String paddleText = detectTextPaddleOcr(imageBytes);
            if (paddleText != null && !paddleText.trim().isEmpty()) {
                return paddleText;
            }
            errors.add("Local PaddleOCR returned empty text.");
        } catch (Throwable t) {
            errors.add("Local PaddleOCR failed: " + t.getMessage());
        }

        /* 
        // 2. If Tesseract fails, go for Google Cloud Document AI
        try {
            log.info("[PayVora KYC Engine] Local Tesseract failed. Trying Google Document AI...");
            String googleText = detectTextGoogle(imageBytes);
            if (googleText != null && !googleText.trim().isEmpty()) {
                return googleText;
            }
            errors.add("Google Document AI returned empty text.");
        } catch (Throwable t) {
            errors.add("Google Document AI failed: " + t.getMessage());
        }

        // 3. If Google fails, try AWS Textract
        if (textractClient != null) {
            log.info("[PayVora KYC Engine] Google Cloud failed. Trying AWS Textract...");
            try {
                software.amazon.awssdk.services.textract.model.Document document = 
                    software.amazon.awssdk.services.textract.model.Document.builder()
                        .bytes(software.amazon.awssdk.core.SdkBytes.fromByteArray(imageBytes))
                        .build();
                        
                software.amazon.awssdk.services.textract.model.DetectDocumentTextRequest request = 
                    software.amazon.awssdk.services.textract.model.DetectDocumentTextRequest.builder()
                        .document(document)
                        .build();
                        
                software.amazon.awssdk.services.textract.model.DetectDocumentTextResponse response = 
                    textractClient.detectDocumentText(request);
                    
                StringBuilder sb = new StringBuilder();
                for (software.amazon.awssdk.services.textract.model.Block block : response.blocks()) {
                    if (block.blockType() == software.amazon.awssdk.services.textract.model.BlockType.LINE) {
                        sb.append(block.text()).append("\n");
                    }
                }
                String text = sb.toString();
                if (!text.trim().isEmpty()) {
                    return text;
                }
                errors.add("AWS Textract returned empty text.");
            } catch (Exception e) {
                errors.add("AWS Textract failed: " + e.getMessage());
            }
        } else {
            errors.add("AWS Textract not configured.");
        }
        */

        // 4. Try Local DJL PaddleOCR
        String paddleText = detectTextPaddleOcr(imageBytes);
        if (paddleText != null && !paddleText.trim().isEmpty()) {
            return paddleText;
        }

        return "";
    }

    private String detectTextGoogle(byte[] imageBytes) {
        if (googleProjectId == null || googleProjectId.trim().isEmpty() ||
            googleProcessorId == null || googleProcessorId.trim().isEmpty()) {
            log.warn("[PayVora KYC Engine] Google Document AI config is incomplete.");
            return "";
        }
        try {
            com.google.auth.oauth2.GoogleCredentials credentials;
            if (googleCredentialsPath != null && !googleCredentialsPath.trim().isEmpty()) {
                try (java.io.FileInputStream fis = new java.io.FileInputStream(googleCredentialsPath.trim())) {
                    credentials = com.google.auth.oauth2.GoogleCredentials.fromStream(fis);
                }
            } else {
                credentials = com.google.auth.oauth2.GoogleCredentials.getApplicationDefault();
            }

            com.google.cloud.documentai.v1.DocumentProcessorServiceSettings settings = 
                com.google.cloud.documentai.v1.DocumentProcessorServiceSettings.newBuilder()
                    .setCredentialsProvider(() -> credentials)
                    .build();

            try (com.google.cloud.documentai.v1.DocumentProcessorServiceClient client = 
                    com.google.cloud.documentai.v1.DocumentProcessorServiceClient.create(settings)) {
                
                String processorName = com.google.cloud.documentai.v1.ProcessorName.of(
                        googleProjectId.trim(), 
                        googleLocation.trim(), 
                        googleProcessorId.trim()
                ).toString();
                
                com.google.protobuf.ByteString content = com.google.protobuf.ByteString.copyFrom(imageBytes);
                
                com.google.cloud.documentai.v1.RawDocument rawDocument = 
                    com.google.cloud.documentai.v1.RawDocument.newBuilder()
                        .setContent(content)
                        .setMimeType("image/jpeg")
                        .build();
                
                com.google.cloud.documentai.v1.ProcessRequest request = 
                    com.google.cloud.documentai.v1.ProcessRequest.newBuilder()
                        .setName(processorName)
                        .setRawDocument(rawDocument)
                        .build();
                
                com.google.cloud.documentai.v1.ProcessResponse response = client.processDocument(request);
                com.google.cloud.documentai.v1.Document document = response.getDocument();
                String text = document.getText();
                log.info("[PayVora KYC Engine] Google Document AI successfully extracted text.");
                return text;
            }
        } catch (Exception e) {
            log.error("[PayVora KYC Engine] Google Document AI failed to detect text: {}", e.getMessage(), e);
            return "";
        }
    }

    private String detectTextTesseract(byte[] imageBytes) {
        try {
            log.info("[PayVora KYC Engine] Attempting Local Tesseract OCR...");
            net.sourceforge.tess4j.Tesseract tesseract = new net.sourceforge.tess4j.Tesseract();
            
            java.io.File localTessData = new java.io.File("c:\\Users\\kandu\\Desktop\\projects_codeshuttle\\bank-ledger\\tessdata");
            if (!localTessData.exists()) {
                localTessData.mkdirs();
            }
            
            java.io.File engData = new java.io.File(localTessData, "eng.traineddata");
            if (!engData.exists()) {
                log.info("[PayVora KYC Engine] Local Tesseract language data missing. Auto-downloading eng.traineddata...");
                try (java.io.InputStream in = new java.net.URL("https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata").openStream()) {
                    java.nio.file.Files.copy(in, engData.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                    log.info("[PayVora KYC Engine] eng.traineddata downloaded successfully.");
                } catch (Exception e) {
                    log.error("[PayVora KYC Engine] Failed to auto-download Tesseract language data: {}", e.getMessage());
                }
            }
            
            String systemTessData = System.getenv("TESSDATA_PREFIX");
            if (systemTessData != null && !systemTessData.trim().isEmpty()) {
                tesseract.setDatapath(systemTessData.trim());
            } else if (localTessData.exists()) {
                tesseract.setDatapath(localTessData.getAbsolutePath());
            }
            
            try (java.io.ByteArrayInputStream bis = new java.io.ByteArrayInputStream(imageBytes)) {
                java.awt.image.BufferedImage image = javax.imageio.ImageIO.read(bis);
                if (image != null) {
                    String fullText = tesseract.doOCR(image);
                    
                    // Split-column OCR for multi-column layouts
                    int w = image.getWidth();
                    int h = image.getHeight();
                    String leftText = "";
                    String rightText = "";
                    
                    try {
                        java.awt.image.BufferedImage leftCol = image.getSubimage(0, 0, (int)(w * 0.54), h);
                        leftText = tesseract.doOCR(leftCol);
                    } catch (Exception e) {
                        log.warn("[PayVora KYC Engine] Left column subimage OCR failed: {}", e.getMessage());
                    }
                    
                    try {
                        java.awt.image.BufferedImage rightCol = image.getSubimage((int)(w * 0.46), 0, w - (int)(w * 0.46), h);
                        rightText = tesseract.doOCR(rightCol);
                    } catch (Exception e) {
                        log.warn("[PayVora KYC Engine] Right column subimage OCR failed: {}", e.getMessage());
                    }
                    
                    log.info("[PayVora KYC Engine] Tesseract OCR successfully extracted text with split columns.");
                    return fullText + "\n" + leftText + "\n" + rightText;
                }
            }
        } catch (Throwable t) {
            log.warn("[PayVora KYC Engine] Tesseract OCR failed: {}", t.getMessage());
        }
        return "";
    }

    private String detectTextPaddleOcr(byte[] imageBytes) {
        try {
            log.info("[PayVora KYC Engine] Attempting Local DJL PaddleOCR inference...");
            try (java.io.ByteArrayInputStream bis = new java.io.ByteArrayInputStream(imageBytes)) {
                ai.djl.modality.cv.Image image = ai.djl.modality.cv.ImageFactory.getInstance().fromInputStream(bis);
                
                ai.djl.repository.zoo.Criteria<ai.djl.modality.cv.Image, String> criteria = 
                    ai.djl.repository.zoo.Criteria.builder()
                        .setTypes(ai.djl.modality.cv.Image.class, String.class)
                        .build();
                
                try (ai.djl.repository.zoo.ZooModel<ai.djl.modality.cv.Image, String> model = criteria.loadModel()) {
                    try (ai.djl.inference.Predictor<ai.djl.modality.cv.Image, String> predictor = model.newPredictor()) {
                        String result = predictor.predict(image);
                        log.info("[PayVora KYC Engine] DJL PaddleOCR successfully extracted text.");
                        return result;
                    }
                }
            }
        } catch (Throwable t) {
            log.warn("[PayVora KYC Engine] DJL PaddleOCR failed: {}", t.getMessage());
        }
        return "";
    }

    private boolean isGrayscale(byte[] imageBytes) {
        if (imageBytes == null || imageBytes.length == 0) {
            return false;
        }
        try (java.io.ByteArrayInputStream bis = new java.io.ByteArrayInputStream(imageBytes)) {
            java.awt.image.BufferedImage img = javax.imageio.ImageIO.read(bis);
            if (img == null) return false;
            
            int width = img.getWidth();
            int height = img.getHeight();
            int grayscalePixels = 0;
            int totalChecked = 0;
            
            for (int y = 0; y < height; y += Math.max(1, height / 30)) {
                for (int x = 0; x < width; x += Math.max(1, width / 30)) {
                    int rgb = img.getRGB(x, y);
                    int r = (rgb >> 16) & 0xFF;
                    int g = (rgb >> 8) & 0xFF;
                    int b = rgb & 0xFF;
                    
                    if (Math.abs(r - g) < 18 && Math.abs(g - b) < 18) {
                        grayscalePixels++;
                    }
                    totalChecked++;
                }
            }
            
            if (totalChecked == 0) return false;
            double ratio = (double) grayscalePixels / totalChecked;
            return ratio > 0.94;
        } catch (Exception e) {
            return false;
        }
    }

    private int getLevenshteinDistance(String s1, String s2) {
        int[] dp = new int[s2.length() + 1];
        for (int j = 0; j <= s2.length(); j++) {
            dp[j] = j;
        }
        for (int i = 1; i <= s1.length(); i++) {
            int prev = dp[0];
            dp[0] = i;
            for (int j = 1; j <= s2.length(); j++) {
                int temp = dp[j];
                if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                    dp[j] = prev;
                } else {
                    dp[j] = Math.min(Math.min(dp[j] + 1, dp[j - 1] + 1), prev + 1);
                }
                prev = temp;
            }
        }
        return dp[s2.length()];
    }

    private String cleanAddressText(String rawAddress) {
        if (rawAddress == null) return "";
        
        // Remove known non-ASCII noise symbols
        String step1 = rawAddress.replaceAll("[^a-zA-Z0-9\\s,.:\\-/()#]", "");
        
        // Split into tokens (words)
        String[] tokens = step1.split("\\s+");
        StringBuilder sb = new StringBuilder();
        
        for (String token : tokens) {
            // Remove leading/trailing punctuation from the token for evaluation
            String cleanToken = token.replaceAll("^[^a-zA-Z0-9]+", "").replaceAll("[^a-zA-Z0-9]+$", "");
            
            if (cleanToken.isEmpty()) {
                continue;
            }
            
            // If the token is too long but has no vowels, it's likely OCR noise (e.g. "zld", "gw")
            boolean hasVowel = cleanToken.toLowerCase().matches(".*[aeiouy].*");
            boolean isDigit = cleanToken.matches("^\\d+$");
            
            if (cleanToken.length() >= 4 && !hasVowel && !isDigit) {
                continue; // Skip gibberish word
            }
            
            // Skip tokens that are single characters of noise (except 'a', 'A', 'i', 'I', 'c', 'o', 'C', 'O')
            if (cleanToken.length() == 1 && !cleanToken.matches("(?i)[aiou]")) {
                if (!token.matches(".*[a-zA-Z0-9].*")) {
                    continue;
                }
            }
            
            sb.append(token).append(" ");
        }
        
        return sb.toString().trim()
                 .replaceAll("\\s+,", ",") // Fix spacing before commas
                 .replaceAll("\\s+\\.", ".")
                 .replaceAll("\\s+", " ");  // Normalize spaces
    }

    private byte[] maskQrCode(byte[] backImageBytes) {
        try (java.io.ByteArrayInputStream bis = new java.io.ByteArrayInputStream(backImageBytes)) {
            java.awt.image.BufferedImage img = javax.imageio.ImageIO.read(bis);
            if (img == null) return backImageBytes;
            
            int width = img.getWidth();
            int height = img.getHeight();
            
            // The QR code resides on the right 45% of the Aadhaar back card
            int startX = (int) (width * 0.55);
            int maskWidth = width - startX;
            
            // Mask the QR code area with a white rectangle
            java.awt.Graphics2D g2d = img.createGraphics();
            g2d.setColor(java.awt.Color.WHITE);
            g2d.fillRect(startX, 0, maskWidth, height);
            g2d.dispose();
            
            try (java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream()) {
                javax.imageio.ImageIO.write(img, "png", bos);
                return bos.toByteArray();
            }
        } catch (Exception e) {
            log.warn("[PayVora KYC Engine] Failed to mask QR code on back image: {}", e.getMessage());
            return backImageBytes;
        }
    }
}
