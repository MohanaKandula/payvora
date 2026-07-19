package com.bankledger.transaction.service;

import com.bankledger.transaction.dto.*;
import com.bankledger.transaction.model.CapitalInjection;
import com.bankledger.transaction.model.InvestmentOrder;
import com.bankledger.transaction.model.TreasuryProfitLoss;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface TreasuryService {
    List<WalletDto> getWallets();
    List<Map> getWalletEntries(UUID walletId);
    Map<String, Object> transferFunds(String adminUser, TransferRequest request);
    Map<String, Object> placeInvestment(String adminUser, InvestmentRequest request);
    Map<String, Object> matureInvestment(String adminUser, UUID orderId, Map<String, String> request);
    Map<String, Object> failInvestment(String adminUser, UUID orderId, Map<String, String> request);
    List<InvestmentOrder> getInvestments();
    Map<String, Object> createInjection(String adminUser, Map<String, Object> payload);
    List<CapitalInjection> getInjections();
    Map<String, Object> approveInjection(String adminUser, UUID injectionId, ApproveInjectionRequest request);
    List<TreasuryProfitLoss> getPnlLogs();
    List<StressTestResult> runStressTest();
    Map<String, Object> calculateExposure();
    Map<String, Object> runReconciliation();
    Map<String, Object> getTreasuryStats();
    boolean isReconciliationFailed();
    void startupHealthCheck();
    List<TreasuryHistoryDto> getTreasuryHistory();
}
