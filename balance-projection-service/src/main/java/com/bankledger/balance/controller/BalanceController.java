package com.bankledger.balance.controller;

import com.bankledger.balance.dto.BalanceDto;
import com.bankledger.balance.model.SpendingAggregate;
import com.bankledger.balance.repository.SpendingAggregateRepository;
import com.bankledger.balance.service.BalanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/balances")
public class BalanceController {

    @Autowired
    private BalanceService balanceService;

    @Autowired
    private SpendingAggregateRepository spendingAggregateRepository;

    @GetMapping("/{accountId}")
    public ResponseEntity<BalanceDto> getBalance(@PathVariable UUID accountId) {
        return ResponseEntity.ok(balanceService.getBalance(accountId));
    }

    @GetMapping("/{accountId}/spending")
    public ResponseEntity<List<SpendingAggregate>> getSpending(@PathVariable UUID accountId) {
        return ResponseEntity.ok(spendingAggregateRepository.findByAccountId(accountId));
    }

    @PostMapping("/rebuild")
    public ResponseEntity<Map<String, String>> rebuildBalances() {
        balanceService.rebuildBalances();
        java.util.Map<String, String> response = new java.util.HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "Balances rebuild successfully completed from ledger entries.");
        return ResponseEntity.ok(response);
    }
}
