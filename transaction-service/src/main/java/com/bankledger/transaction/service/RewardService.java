package com.bankledger.transaction.service;

import com.bankledger.transaction.model.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface RewardService {
    RewardWallet getOrCreateWallet(UUID userId);
    DailyCheckin claimDailyCheckin(UUID userId);
    void processTransactionCashback(UUID userId, UUID transactionId, String transactionType, double amount, String category);
    boolean redeemCashback(UUID userId, double amount);
    List<CashbackTransaction> getHistory(UUID userId);
    List<CashbackOffer> getActiveOffers();
    List<CashbackOffer> getAllOffers();
    CashbackOffer createOffer(CashbackOffer offer);
    CashbackOffer toggleOffer(UUID offerId, boolean active);
    Map<String, Object> getAnalytics();
    void creditReferralReward(UUID referrerAccountId, UUID refereeAccountId);
    RewardConfig getRewardConfig(String key);
    RewardConfig saveRewardConfig(String key, String value);
    Map<String, Object> playSpinWheel(UUID userId);
    Map<String, Object> playScratchCard(UUID userId);
}
