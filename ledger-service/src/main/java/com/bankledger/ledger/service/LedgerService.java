package com.bankledger.ledger.service;

import com.bankledger.ledger.dto.LedgerEntryDto;
import com.bankledger.ledger.dto.TransactionRequest;
import com.bankledger.ledger.dto.TransactionResponse;

import java.util.List;
import java.util.UUID;

public interface LedgerService {
    TransactionResponse processTransaction(TransactionRequest request);
    List<LedgerEntryDto> getAccountHistory(UUID accountId);
    List<LedgerEntryDto> getAllEntries();
    byte[] generateStatementPdf(UUID accountId, String yearMonth);
    com.bankledger.ledger.model.LedgerAccount getAccount(UUID accountId);
}
