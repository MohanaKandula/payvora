package com.bankledger.account.controller;

import com.bankledger.account.dto.*;
import com.bankledger.account.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AccountService accountService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(accountService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(accountService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenRefreshResponse> refresh(@Valid @RequestBody TokenRefreshRequest request) {
        return ResponseEntity.ok(accountService.refreshToken(request));
    }


    @PostMapping("/mfa/verify")
    public ResponseEntity<AuthResponse> verifyMfa(@RequestBody java.util.Map<String, String> request) {
        String username = request.get("username");
        String code = request.get("code");
        return ResponseEntity.ok(accountService.verifyMfaLogin(username, code));
    }

    @PostMapping("/mfa/send-otp")
    public ResponseEntity<java.util.Map<String, String>> sendMfaOtp(@RequestBody java.util.Map<String, String> request) {
        String username = request.get("username");
        try {
            String maskedPhone = accountService.sendMfaOtp(username);
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "SUCCESS");
            response.put("message", "OTP sent successfully to registered phone ending in " + maskedPhone);
            response.put("maskedPhone", maskedPhone);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("status", "FAILED");
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/mfa/verify-otp")
    public ResponseEntity<AuthResponse> verifyMfaOtp(@RequestBody java.util.Map<String, String> request) {
        String username = request.get("username");
        String code = request.get("code");
        return ResponseEntity.ok(accountService.verifyMfaOtp(username, code));
    }
}
