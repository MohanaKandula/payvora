package com.bankledger.account.service;

import com.bankledger.account.dto.*;

import java.util.List;
import java.util.UUID;

public interface AccountService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    TokenRefreshResponse refreshToken(TokenRefreshRequest request);
    AccountResponse getAccountById(UUID accountId);
    AccountResponse getAccountByUsername(String username);
    AccountResponse getAccountByPhoneNumber(String phoneNumber);
    AccountResponse freezeAccount(UUID accountId, String reason);
    AccountResponse unfreezeAccount(UUID accountId, String reason);
    List<AccountResponse> getAllAccounts();
    MfaSetupResponse setupMfa(String username);
    boolean enableMfa(String username, String code);
    AuthResponse verifyMfaLogin(String username, String code);
    boolean verifyTransferMfa(String username, String code);
    String uploadKyc(String username, String documentType, String documentBase64, String documentBackBase64, String documentNumber, String selfieBase64, String dob, String gender, String address);
    void resetMfa(UUID userId);
    void deleteAccount(UUID accountId);
    void setTransactionPin(String username, String pin);
    boolean verifyTransactionPin(String username, String pin);
    String sendOtpForPinReset(String username);
    void resetPinWithOtp(String username, String otp, String newPin);
    String sendMfaOtp(String username);
    AuthResponse verifyMfaOtp(String username, String code);
    String sendOtpForPasswordReset(String username);
    void resetPasswordWithOtp(String username, String otp, String newPassword);
}
