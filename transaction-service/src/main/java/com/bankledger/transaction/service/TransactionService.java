package com.bankledger.transaction.service;

import com.bankledger.transaction.dto.TransactionRequest;
import com.bankledger.transaction.dto.TransactionResponse;

import java.util.UUID;

public interface TransactionService {
    TransactionResponse deposit(TransactionRequest request);
    TransactionResponse withdraw(TransactionRequest request);
    TransactionResponse transfer(TransactionRequest request);
    TransactionResponse getTransactionById(UUID transactionId);
    java.util.List<com.bankledger.transaction.model.Transaction> getFailedTransactions(UUID accountId);
}
