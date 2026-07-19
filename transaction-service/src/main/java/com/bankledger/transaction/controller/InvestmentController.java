package com.bankledger.transaction.controller;

import com.bankledger.transaction.dto.TransactionResponse;
import com.bankledger.transaction.model.InvestmentAccount;
import com.bankledger.transaction.model.InvestmentTransaction;
import com.bankledger.transaction.service.InvestmentService;
import com.bankledger.transaction.service.YieldEngine;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions/investments")
public class InvestmentController {

    @Autowired
    private InvestmentService investmentService;

    @Autowired
    private YieldEngine yieldEngine;

    @GetMapping("/account/{accountId}")
    public ResponseEntity<InvestmentAccount> getInvestmentAccount(@PathVariable UUID accountId) {
        return ResponseEntity.ok(investmentService.getOrCreateInvestmentAccount(accountId));
    }

    @PostMapping("/deposit")
    public ResponseEntity<TransactionResponse> deposit(
            @RequestHeader(value = "X-User-Name", required = false) String username,
            @RequestBody Map<String, Object> request) {
        UUID accountId = UUID.fromString(request.get("accountId").toString());
        BigDecimal amount = new BigDecimal(request.get("amount").toString());
        String pin = request.get("pin") != null ? request.get("pin").toString() : "";
        
        TransactionResponse response = investmentService.deposit(username, accountId, amount, pin);
        if ("FAILED".equals(response.getStatus())) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/withdraw")
    public ResponseEntity<TransactionResponse> withdraw(
            @RequestHeader(value = "X-User-Name", required = false) String username,
            @RequestBody Map<String, Object> request) {
        UUID accountId = UUID.fromString(request.get("accountId").toString());
        BigDecimal amount = new BigDecimal(request.get("amount").toString());
        String pin = request.get("pin") != null ? request.get("pin").toString() : "";
        
        TransactionResponse response = investmentService.withdraw(username, accountId, amount, pin);
        if ("FAILED".equals(response.getStatus())) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history/{accountId}")
    public ResponseEntity<List<InvestmentTransaction>> getHistory(@PathVariable UUID accountId) {
        return ResponseEntity.ok(investmentService.getHistory(accountId));
    }

    // --- Admin Endpoints ---

    @GetMapping("/admin/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        return ResponseEntity.ok(investmentService.getAdminStats());
    }

    @PostMapping("/admin/apy")
    public ResponseEntity<Void> updateApy(@RequestBody Map<String, Object> request) {
        BigDecimal apyRate = new BigDecimal(request.get("apyRate").toString());
        investmentService.updateApy(apyRate);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/admin/pause")
    public ResponseEntity<Void> togglePause(@RequestBody Map<String, Object> request) {
        boolean paused = (Boolean) request.get("paused");
        investmentService.togglePause(paused);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/admin/trigger-yield")
    public ResponseEntity<Map<String, Object>> triggerYield() {
        yieldEngine.runManually();
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("success", true);
        response.put("message", "Manually triggered daily interest yield accrual completed successfully.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/admin/vault-accounts")
    public ResponseEntity<List<InvestmentAccount>> getAllVaultAccounts() {
        // Fetch all user investment accounts (vault accounts)
        return ResponseEntity.ok(((com.bankledger.transaction.service.InvestmentServiceImpl) investmentService).getOrCreateVaultAccountsList());
    }

    @PostMapping("/admin/vault/{accountId}/status")
    public ResponseEntity<Void> updateVaultStatus(
            @PathVariable UUID accountId,
            @RequestHeader(value = "X-User-Name", required = false) String adminUser,
            @RequestBody Map<String, Object> request) {
        String status = request.get("status").toString();
        String reason = request.get("reason") != null ? request.get("reason").toString() : "";
        investmentService.updateVaultStatus(adminUser, accountId, status, reason);
        return ResponseEntity.ok().build();
    }
}
