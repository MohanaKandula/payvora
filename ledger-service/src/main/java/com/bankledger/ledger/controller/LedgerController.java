package com.bankledger.ledger.controller;

import com.bankledger.ledger.dto.LedgerEntryDto;
import com.bankledger.ledger.dto.TransactionRequest;
import com.bankledger.ledger.dto.TransactionResponse;
import com.bankledger.ledger.service.LedgerService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ledger")
public class LedgerController {

    @Autowired
    private LedgerService ledgerService;

    @PostMapping("/transaction")
    public ResponseEntity<TransactionResponse> processTransaction(@Valid @RequestBody TransactionRequest request) {
        TransactionResponse response = ledgerService.processTransaction(request);
        if ("FAILED".equals(response.getStatus())) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<com.bankledger.ledger.model.LedgerAccount> getAccount(@PathVariable UUID accountId) {
        return ResponseEntity.ok(ledgerService.getAccount(accountId));
    }

    @GetMapping("/accounts/{accountId}/entries")
    public ResponseEntity<List<LedgerEntryDto>> getAccountHistory(@PathVariable UUID accountId) {
        return ResponseEntity.ok(ledgerService.getAccountHistory(accountId));
    }

    @GetMapping("/entries")
    public ResponseEntity<List<LedgerEntryDto>> getAllEntries() {
        return ResponseEntity.ok(ledgerService.getAllEntries());
    }

    @GetMapping("/accounts/{accountId}/statement/pdf")
    public ResponseEntity<byte[]> getStatementPdf(
            @PathVariable UUID accountId,
            @RequestParam String month) {
        byte[] pdfBytes = ledgerService.generateStatementPdf(accountId, month);
        return org.springframework.http.ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/pdf")
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=statement_" + month + ".pdf")
                .body(pdfBytes);
    }
}
