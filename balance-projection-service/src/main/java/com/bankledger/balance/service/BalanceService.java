package com.bankledger.balance.service;

import com.bankledger.balance.dto.BalanceDto;
import com.bankledger.balance.event.TransactionCompletedEvent;

import java.util.UUID;

public interface BalanceService {
    BalanceDto getBalance(UUID accountId);
    void processTransactionCompleted(TransactionCompletedEvent event);
    void rebuildBalances();
}
