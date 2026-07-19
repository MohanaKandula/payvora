package com.bankledger.transaction.service;

import com.bankledger.transaction.dto.TransactionResponse;
import com.bankledger.transaction.model.InvestmentAccount;
import com.bankledger.transaction.model.InvestmentTransaction;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface InvestmentService {
    InvestmentAccount getOrCreateInvestmentAccount(UUID accountId);
    TransactionResponse deposit(String username, UUID accountId, BigDecimal amount, String pin);
    TransactionResponse withdraw(String username, UUID accountId, BigDecimal amount, String pin);
    List<InvestmentTransaction> getHistory(UUID accountId);
    Map<String, Object> getAdminStats();
    void updateApy(BigDecimal apyRate);
    void togglePause(boolean paused);
    Map<String, Object> getVaultAnalytics(UUID accountId);
    Map<String, Object> getTreasuryAllocation();
    void updateVaultStatus(String adminUser, UUID accountId, String newStatus, String reason);
}
