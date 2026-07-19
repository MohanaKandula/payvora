package com.bankledger.transaction.controller;

import com.bankledger.transaction.dto.TransactionResponse;
import com.bankledger.transaction.service.RechargeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions/recharge")
public class RechargeController {

    @Autowired
    private RechargeService rechargeService;

    @PostMapping
    public ResponseEntity<TransactionResponse> recharge(
            @RequestHeader(value = "X-User-Name", required = false) String username,
            @RequestBody Map<String, Object> payload) {
        
        UUID accountId = UUID.fromString(payload.get("accountId").toString());
        String phoneNumber = payload.get("phoneNumber").toString();
        String operator = payload.get("operator").toString();
        BigDecimal amount = new BigDecimal(payload.get("amount").toString());
        String pin = payload.get("pin").toString();

        TransactionResponse response = rechargeService.processRecharge(username, accountId, phoneNumber, operator, amount, pin);
        if ("FAILED".equals(response.getStatus())) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }
}
