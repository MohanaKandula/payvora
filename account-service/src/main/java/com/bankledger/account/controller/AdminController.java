package com.bankledger.account.controller;

import com.bankledger.account.dto.AccountResponse;
import com.bankledger.account.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/accounts")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private AccountService accountService;

    @GetMapping
    public ResponseEntity<List<AccountResponse>> getAllAccounts() {
        return ResponseEntity.ok(accountService.getAllAccounts());
    }

    @PutMapping("/{id}/freeze")
    public ResponseEntity<AccountResponse> freezeAccount(
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "Suspicious activity") String reason) {
        return ResponseEntity.ok(accountService.freezeAccount(id, reason));
    }

    @PutMapping("/{id}/unfreeze")
    public ResponseEntity<AccountResponse> unfreezeAccount(
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "Reactivated by Admin") String reason) {
        return ResponseEntity.ok(accountService.unfreezeAccount(id, reason));
    }

    @PostMapping("/{id}/reset-mfa")
    public ResponseEntity<Void> resetMfa(@PathVariable UUID id) {
        accountService.resetMfa(id);
        return ResponseEntity.ok().build();
    }
}
