package com.bankledger.account.service;

import com.bankledger.account.dto.*;
import com.bankledger.account.event.AccountCreatedEvent;
import com.bankledger.account.event.AccountEventPublisher;
import com.bankledger.account.event.AccountStatusChangedEvent;
import com.bankledger.account.model.*;
import com.bankledger.account.repository.AccountRepository;
import com.bankledger.account.repository.UserRepository;
import com.bankledger.account.security.JwtUtils;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AccountServiceImpl implements AccountService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private AccountEventPublisher eventPublisher;

    @Autowired
    private SmsService smsService;

    @Autowired
    private KycVerificationService kycVerificationService;

    @Autowired
    private com.bankledger.account.repository.KYCVerificationRepository kycVerificationRepository;

    @org.springframework.beans.factory.annotation.Value("${spring.profiles.active:}")
    private String activeProfile;

    @org.springframework.beans.factory.annotation.Value("${kyc.provider:AWS}")
    private String kycProviderStr;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username is already taken");
        }
        if (accountRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already registered");
        }
        if (accountRepository.existsByFullNameIgnoreCase(request.getFullName())) {
            throw new IllegalArgumentException("This Full Name is already registered. Please choose another name or match your official KYC ID.");
        }

        UUID accountId = UUID.randomUUID();
        Account account = Account.builder()
                .id(accountId)
                .email(request.getEmail())
                .fullName(request.getFullName())
                .kycStatus(KycStatus.NOT_STARTED)
                .status(AccountStatus.ACTIVE)
                .build();

        String referredByAccountId = null;
        if (request.getReferralCode() != null && !request.getReferralCode().trim().isEmpty()) {
            java.util.Optional<User> referrerOpt = userRepository.findByReferralCode(request.getReferralCode().trim());
            if (referrerOpt.isPresent()) {
                referredByAccountId = referrerOpt.get().getAccount().getId().toString();
            } else {
                throw new IllegalArgumentException("Invalid referral code. Please check the code or leave it blank.");
            }
        }
        
        String myReferralCode = "REF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        UUID userId = UUID.randomUUID();
        Role role = (request.getUsername().equalsIgnoreCase("mohana") || request.getUsername().equalsIgnoreCase("admin")) ? Role.ROLE_ADMIN : Role.ROLE_USER;

        User user = User.builder()
                .id(userId)
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .account(account)
                .mfaEnabled(false)
                .kycStatus("NOT_STARTED")
                .phoneNumber(request.getPhoneNumber())
                .referralCode(myReferralCode)
                .referredBy(referredByAccountId)
                .build();

        userRepository.save(user);
        log.info("User registered successfully: {}, Account ID: {}", request.getUsername(), accountId);

        // Publish account.created event
        eventPublisher.publishAccountCreated(AccountCreatedEvent.builder()
                .eventId(UUID.randomUUID())
                .accountId(accountId)
                .email(account.getEmail())
                .fullName(account.getFullName())
                .status(account.getStatus().name())
                .currency("USD")
                .createdAt(LocalDateTime.now())
                .build());

        // Generate tokens
        String accessToken = jwtUtils.generateAccessToken(user.getUsername(), user.getRole().name());
        String refreshToken = jwtUtils.generateRefreshToken(user.getUsername());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .username(user.getUsername())
                .role(user.getRole().name())
                .accountId(accountId)
                .build();
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        UUID accountId = user.getAccount() != null ? user.getAccount().getId() : null;

        if (user.isMfaEnabled()) {
            log.info("User logged in successfully, MFA required: {}", user.getUsername());
            return AuthResponse.builder()
                    .mfaStatus("MFA_REQUIRED")
                    .username(user.getUsername())
                    .accountId(accountId)
                    .build();
        }

        String accessToken = jwtUtils.generateAccessToken(user.getUsername(), user.getRole().name());
        String refreshToken = jwtUtils.generateRefreshToken(user.getUsername());

        log.info("User logged in successfully: {}", user.getUsername());
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .username(user.getUsername())
                .role(user.getRole().name())
                .accountId(accountId)
                .mfaStatus("SUCCESS")
                .build();
    }

    @Override
    public TokenRefreshResponse refreshToken(TokenRefreshRequest request) {
        String token = request.getRefreshToken();
        if (token != null && jwtUtils.validateJwtToken(token)) {
            String username = jwtUtils.getUsernameFromJwtToken(token);
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            String newAccessToken = jwtUtils.generateAccessToken(user.getUsername(), user.getRole().name());
            String newRefreshToken = jwtUtils.generateRefreshToken(user.getUsername());

            log.info("Token refreshed for user: {}", username);
            return new TokenRefreshResponse(newAccessToken, newRefreshToken);
        }
        throw new IllegalArgumentException("Invalid refresh token");
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse getAccountById(UUID accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        return mapToResponse(account);
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse getAccountByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getAccount() == null) {
            throw new IllegalArgumentException("No account linked to this user");
        }
        return mapToResponse(user.getAccount());
    }

    private String normalizePhoneNumber(String phone) {
        if (phone == null) return "";
        String cleaned = phone.replaceAll("[^0-9]", "");
        if (cleaned.length() >= 10) {
            return cleaned.substring(cleaned.length() - 10);
        }
        return cleaned;
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse getAccountByPhoneNumber(String phoneNumber) {
        String cleanPhone = phoneNumber != null ? phoneNumber.trim() : "";
        String suffix = normalizePhoneNumber(cleanPhone);
        
        User user = null;
        if (!suffix.isEmpty()) {
            List<User> allUsers = userRepository.findAll();
            user = allUsers.stream()
                    .filter(u -> u.getPhoneNumber() != null && normalizePhoneNumber(u.getPhoneNumber()).equals(suffix))
                    .findFirst()
                    .orElse(null);
        }
        
        if (user == null) {
            // Fallback: search by username directly
            user = userRepository.findByUsername(cleanPhone)
                    .orElseThrow(() -> new IllegalArgumentException("No account found with this phone number or username."));
        }

        if (user.getAccount() == null) {
            throw new IllegalArgumentException("No account linked to this user");
        }
        return mapToResponse(user.getAccount());
    }

    @Override
    @Transactional
    public AccountResponse freezeAccount(UUID accountId, String reason) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        
        if (account.getStatus() == AccountStatus.FROZEN) {
            return mapToResponse(account);
        }

        account.setStatus(AccountStatus.FROZEN);
        accountRepository.save(account);
        log.info("Account {} has been FROZEN. Reason: {}", accountId, reason);

        // Publish account.frozen event
        eventPublisher.publishAccountStatusChanged(AccountStatusChangedEvent.builder()
                .eventId(UUID.randomUUID())
                .accountId(accountId)
                .status("FROZEN")
                .reason(reason)
                .createdAt(LocalDateTime.now())
                .build());

        return mapToResponse(account);
    }

    @Override
    @Transactional
    public AccountResponse unfreezeAccount(UUID accountId, String reason) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        if (account.getStatus() != AccountStatus.FROZEN) {
            return mapToResponse(account);
        }

        account.setStatus(AccountStatus.ACTIVE);
        accountRepository.save(account);
        log.info("Account {} has been UNFROZEN. Reason: {}", accountId, reason);

        // Publish account.unfrozen event
        eventPublisher.publishAccountStatusChanged(AccountStatusChangedEvent.builder()
                .eventId(UUID.randomUUID())
                .accountId(accountId)
                .status("ACTIVE")
                .reason(reason)
                .createdAt(LocalDateTime.now())
                .build());

        return mapToResponse(account);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AccountResponse> getAllAccounts() {
        return accountRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private AccountResponse mapToResponse(Account account) {
        User user = userRepository.findByAccount_Id(account.getId()).orElse(null);
        String docType = user != null ? user.getKycDocumentType() : null;
        String docBase64 = user != null ? user.getKycDocumentBase64() : null;
        String docNum = user != null ? user.getKycDocumentNumber() : null;
        String selfieBase64 = user != null ? user.getKycSelfieBase64() : null;

        String kycErr = user != null ? user.getKycErrorDetails() : null;

        java.math.BigDecimal faceMatch = null;
        java.math.BigDecimal ocrConf = null;
        Integer rskScore = null;

        if (account.getId() != null) {
            java.util.Optional<com.bankledger.account.model.KYCVerification> kycOpt =
                    kycVerificationRepository.findTopByUserIdOrderBySubmittedAtDesc(account.getId());
            if (kycOpt.isPresent()) {
                faceMatch = kycOpt.get().getFaceMatchScore();
                ocrConf = kycOpt.get().getOcrConfidence();
                rskScore = kycOpt.get().getRiskScore();
            }
        }

        return AccountResponse.builder()
                .id(account.getId())
                .email(account.getEmail())
                .fullName(account.getFullName())
                .username(user != null ? user.getUsername() : null)
                .kycStatus(account.getKycStatus())
                .status(account.getStatus())
                .kycDocumentType(docType)
                .kycDocumentBase64(docBase64)
                .kycDocumentNumber(docNum)
                .kycSelfieBase64(selfieBase64)
                .mfaEnabled(user != null && user.isMfaEnabled())
                .pinSet(user != null && user.getTransactionPin() != null)
                .phoneNumber(user != null ? user.getPhoneNumber() : null)
                .kycErrorDetails(kycErr)
                .kycProvider(kycProviderStr)
                .referralCode(user != null ? user.getReferralCode() : null)
                .referredBy(user != null ? user.getReferredBy() : null)
                .faceMatchScore(faceMatch)
                .ocrConfidence(ocrConf)
                .riskScore(rskScore)
                .createdAt(account.getCreatedAt())
                .build();
    }

    private GoogleAuthenticator getGoogleAuthenticator() {
        com.warrenstrange.googleauth.GoogleAuthenticatorConfig config = 
                new com.warrenstrange.googleauth.GoogleAuthenticatorConfig.GoogleAuthenticatorConfigBuilder()
                        .setWindowSize(5) // Allow 5 intervals (covers ±2.5 minutes of clock drift)
                        .build();
        return new GoogleAuthenticator(config);
    }

    private boolean verifyAndConsumeBackupCode(User user, String code) {
        if (user.getBackupCodes() == null || user.getBackupCodes().trim().isEmpty()) {
            return false;
        }
        String cleanCode = code.trim().replace("-", "").toUpperCase();
        if (cleanCode.length() != 8) {
            return false;
        }
        String normalizedCode = cleanCode.substring(0, 4) + "-" + cleanCode.substring(4);
        
        java.util.List<String> codes = new java.util.ArrayList<>(java.util.Arrays.asList(user.getBackupCodes().split(",")));
        if (codes.contains(normalizedCode)) {
            codes.remove(normalizedCode);
            user.setBackupCodes(String.join(",", codes));
            userRepository.save(user);
            log.info("Backup code verified and consumed successfully for user: {}", user.getUsername());
            return true;
        }
        return false;
    }

    @Override
    @Transactional
    public MfaSetupResponse setupMfa(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        GoogleAuthenticator gAuth = getGoogleAuthenticator();
        GoogleAuthenticatorKey key = gAuth.createCredentials();
        String secret = key.getKey();
        
        user.setMfaSecret(secret);
        
        // Generate 10 static single-use backup recovery codes formatted as XXXX-XXXX
        java.util.List<String> backupCodes = new java.util.ArrayList<>();
        java.util.Random rand = new java.util.Random();
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        for (int i = 0; i < 10; i++) {
            StringBuilder sb = new StringBuilder();
            for (int j = 0; j < 8; j++) {
                if (j == 4) {
                    sb.append('-');
                }
                sb.append(chars.charAt(rand.nextInt(chars.length())));
            }
            backupCodes.add(sb.toString());
        }
        user.setBackupCodes(String.join(",", backupCodes));
        userRepository.save(user);
        
        String qrCodeUrl;
        try {
            String label = java.net.URLEncoder.encode("AntigravityBank:" + username, java.nio.charset.StandardCharsets.UTF_8.name()).replace("+", "%20");
            String issuer = java.net.URLEncoder.encode("AntigravityBank", java.nio.charset.StandardCharsets.UTF_8.name()).replace("+", "%20");
            qrCodeUrl = String.format("otpauth://totp/%s?secret=%s&issuer=%s", label, secret, issuer);
        } catch (java.io.UnsupportedEncodingException e) {
            qrCodeUrl = "otpauth://totp/AntigravityBank:" + username + "?secret=" + secret + "&issuer=AntigravityBank";
        }
        
        return MfaSetupResponse.builder()
                .secret(secret)
                .qrCodeUrl(qrCodeUrl)
                .backupCodes(backupCodes)
                .build();
    }

    @Override
    @Transactional
    public boolean enableMfa(String username, String code) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (user.getMfaSecret() == null) {
            throw new IllegalStateException("MFA setup has not been initiated");
        }
        
        GoogleAuthenticator gAuth = getGoogleAuthenticator();
        try {
            // Check if backup code format
            String trimmed = code != null ? code.trim() : "";
            if (trimmed.length() == 8 || trimmed.length() == 9 || (trimmed.contains("-") && trimmed.replace("-", "").length() == 8)) {
                if (verifyAndConsumeBackupCode(user, trimmed)) {
                    user.setMfaEnabled(true);
                    userRepository.save(user);
                    return true;
                }
                return false;
            }
            int codeValue = Integer.parseInt(code);
            boolean isValid = gAuth.authorize(user.getMfaSecret(), codeValue);
            if (isValid) {
                user.setMfaEnabled(true);
                userRepository.save(user);
                return true;
            }
        } catch (NumberFormatException e) {
            log.warn("Invalid code format submitted: {}", code);
        }
        return false;
    }

    @Override
    @Transactional
    public AuthResponse verifyMfaLogin(String username, String code) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        GoogleAuthenticator gAuth = getGoogleAuthenticator();
        try {
            // Check if backup code format
            String trimmed = code != null ? code.trim() : "";
            if (trimmed.length() == 8 || trimmed.length() == 9 || (trimmed.contains("-") && trimmed.replace("-", "").length() == 8)) {
                if (verifyAndConsumeBackupCode(user, trimmed)) {
                    String accessToken = jwtUtils.generateAccessToken(user.getUsername(), user.getRole().name());
                    String refreshToken = jwtUtils.generateRefreshToken(user.getUsername());
                    UUID accountId = user.getAccount() != null ? user.getAccount().getId() : null;
                    
                    return AuthResponse.builder()
                            .accessToken(accessToken)
                            .refreshToken(refreshToken)
                            .username(user.getUsername())
                            .role(user.getRole().name())
                            .accountId(accountId)
                            .mfaStatus("SUCCESS")
                            .build();
                }
                throw new IllegalArgumentException("Invalid backup code");
            }
            int codeValue = Integer.parseInt(code);
            boolean isValid = gAuth.authorize(user.getMfaSecret(), codeValue);
            if (isValid) {
                String accessToken = jwtUtils.generateAccessToken(user.getUsername(), user.getRole().name());
                String refreshToken = jwtUtils.generateRefreshToken(user.getUsername());
                UUID accountId = user.getAccount() != null ? user.getAccount().getId() : null;
                
                return AuthResponse.builder()
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .username(user.getUsername())
                        .role(user.getRole().name())
                        .accountId(accountId)
                        .mfaStatus("SUCCESS")
                        .build();
            }
        } catch (NumberFormatException e) {
            log.warn("Invalid code format for MFA login verification");
        }
        throw new IllegalArgumentException("Invalid verification code");
    }

    @Override
    @Transactional
    public boolean verifyTransferMfa(String username, String code) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (!user.isMfaEnabled()) {
            return true;
        }
        
        GoogleAuthenticator gAuth = getGoogleAuthenticator();
        try {
            // Check if backup code format
            String trimmed = code != null ? code.trim() : "";
            if (trimmed.length() == 8 || trimmed.length() == 9 || (trimmed.contains("-") && trimmed.replace("-", "").length() == 8)) {
                return verifyAndConsumeBackupCode(user, trimmed);
            }
            int codeValue = Integer.parseInt(code);
            return gAuth.authorize(user.getMfaSecret(), codeValue);
        } catch (NumberFormatException e) {
            return false;
        }
    }

    @Override
    @Transactional
    public void resetMfa(UUID userId) {
        User user = userRepository.findByAccount_Id(userId)
                .orElseGet(() -> userRepository.findById(userId)
                        .orElseThrow(() -> new IllegalArgumentException("User not found")));
        
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        user.setBackupCodes(null);
        userRepository.save(user);
        log.info("MFA reset successfully for user: {}", user.getUsername());
    }

    @Override
    @Transactional
    public void setTransactionPin(String username, String pin) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (pin == null || pin.length() != 4 || !pin.matches("\\d+")) {
            throw new IllegalArgumentException("PIN must be exactly 4 digits");
        }
        
        user.setTransactionPin(passwordEncoder.encode(pin));
        userRepository.save(user);
        log.info("Transaction PIN set successfully for user: {}", username);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean verifyTransactionPin(String username, String pin) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (user.getTransactionPin() == null) {
            log.warn("Transaction PIN is not set for user: {}", username);
            return false;
        }
        
        return passwordEncoder.matches(pin, user.getTransactionPin());
    }
    @Override
    @Transactional
    public String uploadKyc(
            String username,
            String documentType,
            String documentBase64,
            String documentBackBase64,
            String documentNumber,
            String selfieBase64,
            String dob,
            String gender,
            String address) {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (user.getAccount() == null) {
            throw new IllegalArgumentException("No bank account linked to your profile.");
        }
        
        if (documentNumber == null || documentNumber.trim().isEmpty()) {
            throw new IllegalArgumentException("Document number is required.");
        }
        
        // Save initial parameters to User
        user.setKycDocumentType(documentType);
        user.setKycDocumentBase64(documentBase64);
        user.setKycSelfieBase64(selfieBase64);
        userRepository.save(user);
        
        // Call automated KYC verification service
        com.bankledger.account.model.KYCVerification result = kycVerificationService.verifyAutomatically(
                username, documentType, documentBase64, documentBackBase64, documentNumber, selfieBase64, dob, gender, address
        );
        
        if ("REJECTED".equals(result.getStatus())) {
            throw new IllegalArgumentException("KYC Verification Failed: " + result.getRejectionReason());
        }
        
        return null;
    };

    @Override
    @Transactional
    public void deleteAccount(UUID accountId) {
        User user = userRepository.findByAccount_Id(accountId).orElse(null);
        if (user != null) {
            userRepository.delete(user);
            log.info("Deleted user profile: {}", user.getUsername());
        }
        Account account = accountRepository.findById(accountId).orElse(null);
        if (account != null) {
            accountRepository.delete(account);
            log.info("Deleted wallet account ID: {}", accountId);
        }
    }

    @Override
    @Transactional
    public String sendOtpForPinReset(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (user.getPhoneNumber() == null || user.getPhoneNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("No phone number registered for this account");
        }

        // Generate 6-digit OTP code
        String otp = String.format("%06d", new java.util.Random().nextInt(1000000));
        user.setOtpCode(otp);
        user.setOtpExpiry(java.time.LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);

        String messageBody = "Your AntigravityBank Transaction PIN Reset OTP is: " + otp;
        smsService.sendSms(user.getPhoneNumber(), messageBody);

        String phone = user.getPhoneNumber().trim();
        if (phone.length() > 4) {
            return phone.substring(phone.length() - 4);
        }
        return phone;
    }

    @Override
    @Transactional
    public void resetPinWithOtp(String username, String otp, String newPin) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getOtpCode() == null || !user.getOtpCode().equals(otp)) {
            throw new IllegalArgumentException("Invalid OTP code");
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(java.time.LocalDateTime.now())) {
            throw new IllegalArgumentException("OTP code has expired");
        }

        if (newPin == null || newPin.length() != 4 || !newPin.matches("\\d+")) {
            throw new IllegalArgumentException("PIN must be exactly 4 digits");
        }

        user.setTransactionPin(passwordEncoder.encode(newPin));
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        log.info("Transaction PIN reset successfully using OTP for user: {}", username);
    }

    @Override
    @Transactional
    public String sendMfaOtp(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (user.getPhoneNumber() == null || user.getPhoneNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("No phone number registered for this account");
        }

        // Generate 6-digit OTP code
        String otp = String.format("%06d", new java.util.Random().nextInt(1000000));
        user.setOtpCode(otp);
        user.setOtpExpiry(java.time.LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);

        String messageBody = "Your AntigravityBank Login Verification OTP is: " + otp;
        smsService.sendSms(user.getPhoneNumber(), messageBody);

        String phone = user.getPhoneNumber().trim();
        if (phone.length() > 4) {
            return phone.substring(phone.length() - 4);
        }
        return phone;
    }

    @Override
    @Transactional
    public AuthResponse verifyMfaOtp(String username, String code) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getOtpCode() == null || !user.getOtpCode().equals(code)) {
            throw new IllegalArgumentException("Invalid OTP code");
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(java.time.LocalDateTime.now())) {
            throw new IllegalArgumentException("OTP code has expired");
        }

        // Clear OTP
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        String accessToken = jwtUtils.generateAccessToken(user.getUsername(), user.getRole().name());
        String refreshToken = jwtUtils.generateRefreshToken(user.getUsername());
        UUID accountId = user.getAccount() != null ? user.getAccount().getId() : null;

        log.info("User logged in successfully via SMS MFA OTP: {}", username);
        
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .username(user.getUsername())
                .role(user.getRole().name())
                .accountId(accountId)
                .mfaStatus("SUCCESS")
                .build();
    }

    @Override
    @Transactional
    public String sendOtpForPasswordReset(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found with username: " + username));
        
        if (user.getPhoneNumber() == null || user.getPhoneNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("No phone number registered for this account");
        }

        // Generate 6-digit OTP code
        String otp = String.format("%06d", new java.util.Random().nextInt(1000000));
        user.setOtpCode(otp);
        user.setOtpExpiry(java.time.LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);

        String messageBody = "Your AntigravityBank Password Reset OTP is: " + otp;
        smsService.sendSms(user.getPhoneNumber(), messageBody);

        String phone = user.getPhoneNumber().trim();
        if (phone.length() > 4) {
            return phone.substring(phone.length() - 4);
        }
        return phone;
    }

    @Override
    @Transactional
    public void resetPasswordWithOtp(String username, String otp, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found with username: " + username));

        if (user.getOtpCode() == null || !user.getOtpCode().equals(otp)) {
            throw new IllegalArgumentException("Invalid OTP code");
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(java.time.LocalDateTime.now())) {
            throw new IllegalArgumentException("OTP code has expired");
        }

        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        log.info("Password reset successfully using OTP for user: {}", username);
    }
}
