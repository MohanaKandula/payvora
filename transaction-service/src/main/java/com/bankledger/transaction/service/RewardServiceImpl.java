package com.bankledger.transaction.service;

import com.bankledger.transaction.client.AccountClient;
import com.bankledger.transaction.dto.TransactionRequest;
import com.bankledger.transaction.dto.TransactionResponse;
import com.bankledger.transaction.model.*;
import com.bankledger.transaction.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Slf4j
public class RewardServiceImpl implements RewardService {

    @Autowired
    private CashbackOfferRepository offerRepository;

    @Autowired
    private CashbackTransactionRepository cashbackTransactionRepository;

    @Autowired
    private DailyCheckinRepository dailyCheckinRepository;

    @Autowired
    private RewardWalletRepository walletRepository;

    @Autowired
    private AccountClient accountClient;

    @Autowired
    private RewardConfigRepository rewardConfigRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Autowired
    @Lazy
    private TransactionService transactionService;

    @Autowired
    private com.bankledger.transaction.client.LedgerClient ledgerClient;

    @Autowired
    private com.bankledger.transaction.repository.TreasuryAuditLogRepository treasuryAuditLogRepository;

    private static final UUID CASHBACK_WALLET_ID = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c605");

    private BigDecimal getCashbackWalletBalance() {
        return ledgerClient.getWalletBalance(CASHBACK_WALLET_ID);
    }

    private void writeAuditLog(String actionType, UUID referenceId, BigDecimal balance, String status, String reason) {
        try {
            com.bankledger.transaction.model.TreasuryAuditLog auditLog = com.bankledger.transaction.model.TreasuryAuditLog.builder()
                    .id(UUID.randomUUID())
                    .adminUser("SYSTEM")
                    .actionType(actionType)
                    .referenceId(referenceId)
                    .walletId(CASHBACK_WALLET_ID)
                    .beforeBalance(balance)
                    .afterBalance(balance)
                    .status(status)
                    .ipAddress("127.0.0.1")
                    .deviceInfo("Reward Engine System Check")
                    .reason(reason)
                    .createdAt(LocalDateTime.now())
                    .build();
            treasuryAuditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to write reward audit log", e);
        }
    }

    private void checkTreasuryHealth() {
        if (com.bankledger.transaction.controller.TreasuryController.isReconciliationFailed()) {
            throw new IllegalStateException("Reconciliation Failure Lock: All neobank rewards and distributions are suspended.");
        }
    }

    @Override
    @Transactional
    public RewardWallet getOrCreateWallet(UUID userId) {
        return walletRepository.findById(userId)
                .orElseGet(() -> {
                    RewardWallet newWallet = RewardWallet.builder()
                            .userId(userId)
                            .cashbackBalance(0.0)
                            .totalCashbackEarned(0.0)
                            .cashbackUsed(0.0)
                            .loyaltyPoints(100) // Start with 100 points for easy sandbox testing!
                            .loyaltyLevel("BRONZE")
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return walletRepository.save(newWallet);
                });
    }

    @Override
    @Transactional
    public DailyCheckin claimDailyCheckin(UUID userId) {
        checkTreasuryHealth();
        java.util.Map accountDetails = accountClient.getAccountDetails(userId);
        if (accountDetails == null) {
            throw new IllegalArgumentException("KYC verification must be completed before using financial services.");
        }
        String kycStatus = accountDetails.get("kycStatus") != null ? accountDetails.get("kycStatus").toString() : "NOT_STARTED";
        Boolean mfaEnabled = (Boolean) accountDetails.get("mfaEnabled");
        String fullName = (String) accountDetails.get("fullName");
        String email = (String) accountDetails.get("email");
        String phoneNumber = (String) accountDetails.get("phoneNumber");
        String status = accountDetails.get("status") != null ? accountDetails.get("status").toString() : "";

        if (!"APPROVED".equals(kycStatus) || mfaEnabled == null || !mfaEnabled ||
            fullName == null || fullName.trim().isEmpty() ||
            email == null || email.trim().isEmpty() ||
            phoneNumber == null || phoneNumber.trim().isEmpty() ||
            !"ACTIVE".equals(status)) {
            throw new IllegalArgumentException("KYC verification must be completed before using financial services.");
        }

        LocalDate today = LocalDate.now();
        Optional<DailyCheckin> existingOpt = dailyCheckinRepository.findByUserIdAndCheckinDate(userId, today);
        if (existingOpt.isPresent()) {
            throw new IllegalArgumentException("You have already checked in today!");
        }

        // Earn 10 points + $0.50 daily cashback rewards
        int pointsEarned = 10;
        double dailyReward = 0.50;

        BigDecimal cashbackBal = getCashbackWalletBalance();
        if (cashbackBal.compareTo(BigDecimal.valueOf(dailyReward)) < 0) {
            writeAuditLog("DAILY_CHECKIN_FAILED", userId, cashbackBal, "FAILED", "Rewards budget exhausted. Cashback Wallet has insufficient funds.");
            throw new IllegalArgumentException("Rewards budget exhausted. Cashback Wallet has insufficient funds.");
        }

        DailyCheckin checkin = DailyCheckin.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .checkinDate(today)
                .pointsEarned(pointsEarned)
                .createdAt(LocalDateTime.now())
                .build();
        dailyCheckinRepository.save(checkin);

        RewardWallet wallet = getOrCreateWallet(userId);
        wallet.setLoyaltyPoints(wallet.getLoyaltyPoints() + pointsEarned);
        wallet.setCashbackBalance(wallet.getCashbackBalance() + dailyReward);
        wallet.setTotalCashbackEarned(wallet.getTotalCashbackEarned() + dailyReward);
        wallet.setUpdatedAt(LocalDateTime.now());
        
        updateLoyaltyLevel(wallet);
        walletRepository.save(wallet);

        // Save daily reward transaction log
        CashbackTransaction rewardTx = CashbackTransaction.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .cashbackAmount(dailyReward)
                .status("CREDITED")
                .creditedAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusYears(1))
                .build();
        cashbackTransactionRepository.save(rewardTx);

        return checkin;
    }

    @Override
    @Transactional
    public void processTransactionCashback(UUID userId, UUID transactionId, String transactionType, double amount, String category) {
        checkTreasuryHealth();
        log.info("Evaluating rewards for user: {}, type: {}, amount: {}, category: {}", userId, transactionType, amount, category);
        
        List<CashbackOffer> activeOffers = offerRepository.findByActiveTrue();
        RewardWallet wallet = getOrCreateWallet(userId);
        
        for (CashbackOffer offer : activeOffers) {
            // 1. Transaction Type filter check
            boolean matchesType = offer.getTransactionType().equalsIgnoreCase(transactionType);
            
            // Special fallback matching for utility payments & recharges:
            // Mobile Recharge in system is a TRANSFER with RECHARGE category, but offer is configured as WITHDRAWAL.
            // Bill Payment in system is a TRANSFER with BILL category, but offer is configured as WITHDRAWAL.
            if (!matchesType) {
                String categoryUpper = (category != null) ? category.toUpperCase() : "";
                if (offer.getTitle().equalsIgnoreCase("Recharge Offer") && categoryUpper.startsWith("RECHARGE")) {
                    matchesType = true;
                } else if (offer.getTitle().equalsIgnoreCase("Bill Payment Offer") && (categoryUpper.startsWith("BILL") || categoryUpper.startsWith("UTILITY"))) {
                    matchesType = true;
                }
            }

            if (!matchesType) {
                continue;
            }

            // 2. Minimum amount check
            if (amount < offer.getMinAmount()) {
                continue;
            }

            // 3. Prevent duplicate claims for "First Transaction Reward"
            if (offer.getId().toString().equals("11111111-1111-1111-1111-111111111111")) {
                List<CashbackTransaction> history = cashbackTransactionRepository.findByUserIdOrderByCreditedAtDesc(userId);
                boolean claimedFirst = history.stream().anyMatch(t -> offer.getId().equals(t.getOfferId()));
                if (claimedFirst) {
                    continue;
                }
            }

            // 4. Calculate Cashback
            double reward = 0.0;
            if (offer.getFixedCashback() > 0) {
                reward = offer.getFixedCashback();
            } else if (offer.getCashbackPercentage() > 0) {
                reward = amount * (offer.getCashbackPercentage() / 100.0);
            }

            if (offer.getMaxCashback() > 0 && reward > offer.getMaxCashback()) {
                reward = offer.getMaxCashback();
            }

            if (reward <= 0.0) {
                continue;
            }

            BigDecimal cashbackBal = getCashbackWalletBalance();
            if (cashbackBal.compareTo(BigDecimal.valueOf(reward)) < 0) {
                writeAuditLog("CASHBACK_FAILED", userId, cashbackBal, "FAILED", "Rewards budget exhausted. Cashback Wallet has insufficient funds to cover reward of $" + reward);
                log.warn("Rewards budget exhausted. Skipping cashback of {} for transaction {}", reward, transactionId);
                break;
            }

            // 5. Crediting reward values
            wallet.setCashbackBalance(wallet.getCashbackBalance() + reward);
            wallet.setTotalCashbackEarned(wallet.getTotalCashbackEarned() + reward);
            
            // Add loyalty points based on transaction size
            int pointsToAdd = 10 + (int) (amount * 0.1);
            wallet.setLoyaltyPoints(wallet.getLoyaltyPoints() + pointsToAdd);
            wallet.setUpdatedAt(LocalDateTime.now());
            
            updateLoyaltyLevel(wallet);
            walletRepository.save(wallet);

            CashbackTransaction cbTx = CashbackTransaction.builder()
                    .id(UUID.randomUUID())
                    .userId(userId)
                    .transactionId(transactionId)
                    .cashbackAmount(reward)
                    .offerId(offer.getId())
                    .status("CREDITED")
                    .creditedAt(LocalDateTime.now())
                    .expiresAt(LocalDateTime.now().plusYears(1))
                    .build();
            cashbackTransactionRepository.save(cbTx);
            
            log.info("Successfully credited ${} cashback to user {}", reward, userId);
            
            // Trigger only once per transaction for first matching offer
            break;
        }
    }

    @Override
    @Transactional
    public boolean redeemCashback(UUID userId, double amount) {
        java.util.Map accountDetails = accountClient.getAccountDetails(userId);
        if (accountDetails == null) {
            throw new IllegalArgumentException("KYC verification must be completed before using financial services.");
        }
        String kycStatus = accountDetails.get("kycStatus") != null ? accountDetails.get("kycStatus").toString() : "NOT_STARTED";
        Boolean mfaEnabled = (Boolean) accountDetails.get("mfaEnabled");
        String fullName = (String) accountDetails.get("fullName");
        String email = (String) accountDetails.get("email");
        String phoneNumber = (String) accountDetails.get("phoneNumber");
        String status = accountDetails.get("status") != null ? accountDetails.get("status").toString() : "";

        if (!"APPROVED".equals(kycStatus) || mfaEnabled == null || !mfaEnabled ||
            fullName == null || fullName.trim().isEmpty() ||
            email == null || email.trim().isEmpty() ||
            phoneNumber == null || phoneNumber.trim().isEmpty() ||
            !"ACTIVE".equals(status)) {
            throw new IllegalArgumentException("KYC verification must be completed before using financial services.");
        }

        RewardWallet wallet = getOrCreateWallet(userId);
        BigDecimal cashbackBal = getCashbackWalletBalance();
        if (cashbackBal.compareTo(BigDecimal.valueOf(amount)) < 0) {
            writeAuditLog("REDEMPTION_FAILED", userId, cashbackBal, "FAILED", "Rewards budget exhausted. Cashback Wallet has insufficient funds.");
            throw new IllegalArgumentException("Rewards budget exhausted. Cashback Wallet has insufficient funds.");
        }
        if (wallet.getCashbackBalance() < amount) {
            throw new IllegalArgumentException("Insufficient cashback balance!");
        }

        // Submitting real ledger transfer from Cashback System Wallet to User Wallet
        TransactionRequest transferReq = new TransactionRequest();
        transferReq.setSourceAccountId(UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c605")); // Cashback Wallet
        transferReq.setTargetAccountId(userId);
        transferReq.setAmount(BigDecimal.valueOf(amount));
        transferReq.setCurrency("USD");
        transferReq.setIdempotencyKey(UUID.randomUUID().toString());
        transferReq.setCategory("CASHBACK");

        TransactionResponse response = transactionService.transfer(transferReq);
        if ("COMPLETED".equals(response.getStatus())) {
            wallet.setCashbackBalance(wallet.getCashbackBalance() - amount);
            wallet.setCashbackUsed(wallet.getCashbackUsed() + amount);
            wallet.setUpdatedAt(LocalDateTime.now());
            walletRepository.save(wallet);

            CashbackTransaction redemptionLog = CashbackTransaction.builder()
                    .id(UUID.randomUUID())
                    .userId(userId)
                    .cashbackAmount(-amount)
                    .status("REDEEMED")
                    .creditedAt(LocalDateTime.now())
                    .build();
            cashbackTransactionRepository.save(redemptionLog);
            return true;
        }
        return false;
    }

    @Override
    public List<CashbackTransaction> getHistory(UUID userId) {
        return cashbackTransactionRepository.findByUserIdOrderByCreditedAtDesc(userId);
    }

    @Override
    public List<CashbackOffer> getActiveOffers() {
        return offerRepository.findByActiveTrue();
    }

    @Override
    public List<CashbackOffer> getAllOffers() {
        return offerRepository.findAll();
    }

    @Override
    @Transactional
    public CashbackOffer createOffer(CashbackOffer offer) {
        if (offer.getId() == null) {
            offer.setId(UUID.randomUUID());
        }
        return offerRepository.save(offer);
    }

    @Override
    @Transactional
    public CashbackOffer toggleOffer(UUID offerId, boolean active) {
        CashbackOffer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new IllegalArgumentException("Offer not found!"));
        offer.setActive(active);
        return offerRepository.save(offer);
    }

    @Override
    public Map<String, Object> getAnalytics() {
        Map<String, Object> stats = new HashMap<>();
        List<CashbackTransaction> allTx = cashbackTransactionRepository.findAll();
        
        double totalDisbursed = allTx.stream()
                .filter(t -> t.getCashbackAmount() > 0)
                .mapToDouble(CashbackTransaction::getCashbackAmount)
                .sum();

        double totalRedeemed = allTx.stream()
                .filter(t -> t.getCashbackAmount() < 0)
                .mapToDouble(t -> Math.abs(t.getCashbackAmount()))
                .sum();

        double rewardsBudget = 500.0;
        double remainingBudget = Math.max(0.0, rewardsBudget - totalDisbursed);

        stats.put("totalDisbursed", totalDisbursed);
        stats.put("totalRedeemed", totalRedeemed);
        stats.put("rewardsBudget", rewardsBudget);
        stats.put("remainingBudget", remainingBudget);
        stats.put("offersCount", offerRepository.count());
        stats.put("activeOffersCount", offerRepository.findByActiveTrue().size());
        stats.put("totalClaims", allTx.size());

        return stats;
    }

    private void updateLoyaltyLevel(RewardWallet wallet) {
        int pts = wallet.getLoyaltyPoints();
        if (pts >= 1500) {
            wallet.setLoyaltyLevel("PLATINUM");
        } else if (pts >= 500) {
            wallet.setLoyaltyLevel("GOLD");
        } else if (pts >= 100) {
            wallet.setLoyaltyLevel("SILVER");
        } else {
            wallet.setLoyaltyLevel("BRONZE");
        }
    }

    @Override
    @Transactional
    public void creditReferralReward(UUID referrerAccountId, UUID refereeAccountId) {
        checkTreasuryHealth();
        log.info("Crediting referral reward of $10.00 to referrer {} and referee {}", referrerAccountId, refereeAccountId);
        double referralBonus = 10.00;

        BigDecimal cashbackBal = getCashbackWalletBalance();
        if (cashbackBal.compareTo(BigDecimal.valueOf(20.00)) < 0) {
            writeAuditLog("REFERRAL_REWARD_FAILED", referrerAccountId, cashbackBal, "FAILED", "Rewards budget exhausted. Cashback Wallet has insufficient funds.");
            throw new IllegalArgumentException("Rewards budget exhausted. Cashback Wallet has insufficient funds.");
        }
        
        // 1. Credit Referrer
        RewardWallet referrerWallet = getOrCreateWallet(referrerAccountId);
        referrerWallet.setCashbackBalance(referrerWallet.getCashbackBalance() + referralBonus);
        referrerWallet.setTotalCashbackEarned(referrerWallet.getTotalCashbackEarned() + referralBonus);
        referrerWallet.setLoyaltyPoints(referrerWallet.getLoyaltyPoints() + 50); // Add 50 loyalty points!
        referrerWallet.setUpdatedAt(LocalDateTime.now());
        updateLoyaltyLevel(referrerWallet);
        walletRepository.save(referrerWallet);

        CashbackTransaction refTx = CashbackTransaction.builder()
                .id(UUID.randomUUID())
                .userId(referrerAccountId)
                .cashbackAmount(referralBonus)
                .offerId(UUID.fromString("77777777-7777-7777-7777-777777777777")) // Referral offer ID
                .status("CREDITED")
                .creditedAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusYears(1))
                .build();
        cashbackTransactionRepository.save(refTx);

        // 2. Credit Referee (Sravanthi)
        RewardWallet refereeWallet = getOrCreateWallet(refereeAccountId);
        refereeWallet.setCashbackBalance(refereeWallet.getCashbackBalance() + referralBonus);
        refereeWallet.setTotalCashbackEarned(refereeWallet.getTotalCashbackEarned() + referralBonus);
        refereeWallet.setLoyaltyPoints(refereeWallet.getLoyaltyPoints() + 50); // Add 50 loyalty points!
        refereeWallet.setUpdatedAt(LocalDateTime.now());
        updateLoyaltyLevel(refereeWallet);
        walletRepository.save(refereeWallet);

        CashbackTransaction refereeTx = CashbackTransaction.builder()
                .id(UUID.randomUUID())
                .userId(refereeAccountId)
                .cashbackAmount(referralBonus)
                .offerId(UUID.fromString("77777777-7777-7777-7777-777777777777")) // Referral offer ID
                .status("CREDITED")
                .creditedAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusYears(1))
                .build();
        cashbackTransactionRepository.save(refereeTx);
    }

    @Override
    public RewardConfig getRewardConfig(String key) {
        return rewardConfigRepository.findById(key)
                .orElseThrow(() -> new IllegalArgumentException("Config not found for key: " + key));
    }

    @Override
    @Transactional
    public RewardConfig saveRewardConfig(String key, String value) {
        RewardConfig config = rewardConfigRepository.findById(key)
                .orElseGet(() -> RewardConfig.builder().configKey(key).build());
        config.setConfigValue(value);
        return rewardConfigRepository.save(config);
    }

    @Override
    @Transactional
    public Map<String, Object> playSpinWheel(UUID userId) {
        return playCampaignGame(userId, "spin_wheel");
    }

    @Override
    @Transactional
    public Map<String, Object> playScratchCard(UUID userId) {
        return playCampaignGame(userId, "scratch_card");
    }

    private Map<String, Object> playCampaignGame(UUID userId, String gameKey) {
        checkTreasuryHealth();
        RewardConfig config = rewardConfigRepository.findById(gameKey)
                .orElseThrow(() -> new IllegalArgumentException("Game config not found: " + gameKey));
        
        try {
            Map<String, Object> configMap = objectMapper.readValue(config.getConfigValue(), Map.class);
            List<Map<String, Object>> prizes = (List<Map<String, Object>>) configMap.get("prizes");
            if (prizes == null || prizes.isEmpty()) {
                throw new IllegalArgumentException("No prizes configured for " + gameKey);
            }

            int totalWeight = 0;
            for (Map<String, Object> prize : prizes) {
                totalWeight += ((Number) prize.getOrDefault("weight", 10)).intValue();
            }

            int randomValue = new java.util.Random().nextInt(totalWeight);
            Map<String, Object> winningPrize = prizes.get(0);
            int accumulatedWeight = 0;
            for (Map<String, Object> prize : prizes) {
                accumulatedWeight += ((Number) prize.getOrDefault("weight", 10)).intValue();
                if (randomValue < accumulatedWeight) {
                    winningPrize = prize;
                    break;
                }
            }

            String prizeName = winningPrize.get("name").toString();
            int points = ((Number) winningPrize.getOrDefault("points", 0)).intValue();
            double cashback = ((Number) winningPrize.getOrDefault("cashback", 0.0)).doubleValue();

            RewardWallet wallet = getOrCreateWallet(userId);
            int cost = "spin_wheel".equals(gameKey) ? 50 : 30;
            if (wallet.getLoyaltyPoints() < cost) {
                throw new IllegalArgumentException("Insufficient loyalty points! You need at least " + cost + " points to play.");
            }
            wallet.setLoyaltyPoints(wallet.getLoyaltyPoints() - cost);

            if (points > 0) {
                wallet.setLoyaltyPoints(wallet.getLoyaltyPoints() + points);
            }
            if (cashback > 0) {
                BigDecimal cashbackBal = getCashbackWalletBalance();
                if (cashbackBal.compareTo(BigDecimal.valueOf(cashback)) < 0) {
                    writeAuditLog("GAME_REWARD_FAILED", userId, cashbackBal, "FAILED", "Rewards budget exhausted. Cashback Wallet has insufficient funds.");
                    throw new IllegalArgumentException("Rewards budget exhausted. Cashback Wallet has insufficient funds.");
                }
                wallet.setCashbackBalance(wallet.getCashbackBalance() + cashback);
                wallet.setTotalCashbackEarned(wallet.getTotalCashbackEarned() + cashback);
            }
            wallet.setUpdatedAt(LocalDateTime.now());
            updateLoyaltyLevel(wallet);
            walletRepository.save(wallet);

            if (cashback > 0) {
                CashbackTransaction tx = CashbackTransaction.builder()
                        .id(UUID.randomUUID())
                        .userId(userId)
                        .cashbackAmount(cashback)
                        .status("CREDITED")
                        .creditedAt(LocalDateTime.now())
                        .expiresAt(LocalDateTime.now().plusYears(1))
                        .build();
                cashbackTransactionRepository.save(tx);
            }

            // Create system notification
            String title = "spin_wheel".equals(gameKey) ? "Lucky Spin Winner!" : "Scratch Card Winner!";
            String message = "Congratulations! You won: " + prizeName;
            notificationService.createNotification(userId, title, message);

            Map<String, Object> result = new HashMap<>();
            result.put("prize", winningPrize);
            result.put("wallet", wallet);
            return result;

        } catch (Exception e) {
            log.error("Failed to parse/play game " + gameKey, e);
            throw new IllegalArgumentException("Game execution failed: " + e.getMessage());
        }
    }
}
