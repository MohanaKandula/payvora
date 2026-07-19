package com.bankledger.transaction.controller;

import com.bankledger.transaction.service.InvestmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
public class VaultController {

    @Autowired
    private InvestmentService investmentService;

    @GetMapping("/api/vault/analytics/{accountId}")
    public ResponseEntity<Map<String, Object>> getVaultAnalytics(@PathVariable UUID accountId) {
        return ResponseEntity.ok(investmentService.getVaultAnalytics(accountId));
    }

    @GetMapping("/api/treasury/allocation")
    public ResponseEntity<Map<String, Object>> getTreasuryAllocation() {
        return ResponseEntity.ok(investmentService.getTreasuryAllocation());
    }
}
