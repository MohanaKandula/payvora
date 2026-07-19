package com.bankledger.transaction.controller;

import com.bankledger.transaction.client.AccountClient;
import com.bankledger.transaction.dto.*;
import com.bankledger.transaction.model.CapitalInjection;
import com.bankledger.transaction.model.InvestmentOrder;
import com.bankledger.transaction.model.TreasuryAuditLog;
import com.bankledger.transaction.model.TreasuryProfitLoss;
import com.bankledger.transaction.repository.TreasuryAuditLogRepository;
import com.bankledger.transaction.service.TreasuryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/treasury")
@Slf4j
public class TreasuryController {

    @Autowired
    private TreasuryService treasuryService;

    @Autowired
    private TreasuryAuditLogRepository treasuryAuditLogRepository;

    @Autowired
    private AccountClient accountClient;

    public static boolean isReconciliationFailed() {
        // Return reconciliation status from service dynamically
        // Note: Spring will inject the bean and we can check it. To keep it static/simple, we can just look up the bean or reference service.
        // But since this is a static method used elsewhere in transaction-service, let's keep a delegate helper.
        // Wait, how can we access the non-static method isReconciliationFailed() from a static context?
        // We can store a static reference to the service instance during initialization or lookup.
        return staticTreasuryService != null && staticTreasuryService.isReconciliationFailed();
    }

    private static TreasuryService staticTreasuryService;

    @Autowired
    public void setStaticTreasuryService(TreasuryService treasuryService) {
        staticTreasuryService = treasuryService;
    }

    @GetMapping("/wallets")
    public ResponseEntity<List<WalletDto>> getWallets() {
        return ResponseEntity.ok(treasuryService.getWallets());
    }

    @GetMapping("/wallets/{walletId}/entries")
    public ResponseEntity<List<Map>> getWalletEntries(@PathVariable UUID walletId) {
        return ResponseEntity.ok(treasuryService.getWalletEntries(walletId));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<List<TreasuryAuditLog>> getAuditLogs() {
        return ResponseEntity.ok(treasuryAuditLogRepository.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping("/transfer")
    public ResponseEntity<Map<String, Object>> executeTransfer(
            @RequestHeader("X-User-Name") String adminUser,
            @RequestBody TransferRequest request) {

        Map<String, Object> response = new HashMap<>();

        if (treasuryService.isReconciliationFailed()) {
            response.put("success", false);
            response.put("message", "Reconciliation Failure Lock: All treasury actions are suspended.");
            return ResponseEntity.badRequest().body(response);
        }

        // 1. PIN Check
        if (request.getAdminPin() == null || !accountClient.verifyTransactionPin(adminUser, request.getAdminPin())) {
            response.put("success", false);
            response.put("message", "Authentication Failure: Invalid Admin transaction PIN.");
            return ResponseEntity.badRequest().body(response);
        }

        // 2. MFA/2FA Check
        if (request.getMfaCode() != null && !request.getMfaCode().trim().isEmpty()) {
            boolean mfaOk = accountClient.verifyTransferMfa(adminUser, request.getMfaCode().trim());
            if (!mfaOk) {
                response.put("success", false);
                response.put("message", "Authentication Failure: Invalid 2FA verification code.");
                return ResponseEntity.badRequest().body(response);
            }
        }

        Map<String, Object> result = treasuryService.transferFunds(adminUser, request);
        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    @GetMapping("/investments")
    public ResponseEntity<List<InvestmentOrder>> getInvestments() {
        return ResponseEntity.ok(treasuryService.getInvestments());
    }

    @PostMapping("/investments")
    public ResponseEntity<Map<String, Object>> createInvestment(
            @RequestHeader("X-User-Name") String adminUser,
            @RequestBody InvestmentRequest request) {

        if (treasuryService.isReconciliationFailed()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Reconciliation Failure Lock: All treasury actions are suspended.");
            return ResponseEntity.badRequest().body(response);
        }

        Map<String, Object> result = treasuryService.placeInvestment(adminUser, request);
        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    @PostMapping("/investments/{orderId}/mature")
    public ResponseEntity<Map<String, Object>> matureInvestment(
            @RequestHeader("X-User-Name") String adminUser,
            @PathVariable UUID orderId,
            @RequestBody Map<String, String> request) {

        if (treasuryService.isReconciliationFailed()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Reconciliation Failure Lock: All treasury actions are suspended.");
            return ResponseEntity.badRequest().body(response);
        }

        Map<String, Object> result = treasuryService.matureInvestment(adminUser, orderId, request);
        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    @PostMapping("/investments/{orderId}/fail")
    public ResponseEntity<Map<String, Object>> failInvestment(
            @RequestHeader("X-User-Name") String adminUser,
            @PathVariable UUID orderId,
            @RequestBody Map<String, String> request) {

        if (treasuryService.isReconciliationFailed()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Reconciliation Failure Lock: All treasury actions are suspended.");
            return ResponseEntity.badRequest().body(response);
        }

        Map<String, Object> result = treasuryService.failInvestment(adminUser, orderId, request);
        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    @PostMapping("/injections")
    public ResponseEntity<Map<String, Object>> createInjection(
            @RequestHeader("X-User-Name") String adminUser,
            @RequestBody Map<String, Object> payload) {

        if (treasuryService.isReconciliationFailed()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Reconciliation Failure Lock: All treasury actions are suspended.");
            return ResponseEntity.badRequest().body(response);
        }

        Map<String, Object> result = treasuryService.createInjection(adminUser, payload);
        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    @GetMapping("/injections")
    public ResponseEntity<List<CapitalInjection>> getInjections() {
        return ResponseEntity.ok(treasuryService.getInjections());
    }

    @PostMapping("/injections/{injectionId}/approve")
    public ResponseEntity<Map<String, Object>> approveInjection(
            @RequestHeader("X-User-Name") String adminUser,
            @PathVariable UUID injectionId,
            @RequestBody ApproveInjectionRequest request) {

        if (treasuryService.isReconciliationFailed()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Reconciliation Failure Lock: All treasury actions are suspended.");
            return ResponseEntity.badRequest().body(response);
        }

        // PIN Check
        if (request.getAdminPin() == null || !accountClient.verifyTransactionPin(adminUser, request.getAdminPin())) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Authentication Failure: Invalid Admin transaction PIN.");
            return ResponseEntity.badRequest().body(response);
        }

        Map<String, Object> result = treasuryService.approveInjection(adminUser, injectionId, request);
        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    @GetMapping("/pnl")
    public ResponseEntity<List<TreasuryProfitLoss>> getPnl() {
        return ResponseEntity.ok(treasuryService.getPnlLogs());
    }

    @GetMapping("/stress-test")
    public ResponseEntity<List<StressTestResult>> runStressTest() {
        return ResponseEntity.ok(treasuryService.runStressTest());
    }

    @GetMapping({"/exposure", "/compliance"})
    public ResponseEntity<Map<String, Object>> checkCompliance() {
        return ResponseEntity.ok(treasuryService.calculateExposure());
    }

    @GetMapping("/reconciliation")
    public ResponseEntity<Map<String, Object>> checkReconciliation() {
        return ResponseEntity.ok(treasuryService.runReconciliation());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(treasuryService.getTreasuryStats());
    }
}
