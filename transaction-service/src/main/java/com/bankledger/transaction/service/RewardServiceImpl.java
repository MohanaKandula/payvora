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
    private com.bankledger.transaction.repository.NotificationRepository notificationRepository;

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
        try {
            BigDecimal bal = ledgerClient.getWalletBalance(CASHBACK_WALLET_ID);
            if (bal != null && bal.compareTo(BigDecimal.ZERO) > 0) {
                return bal;
            }
        } catch (Exception e) {
            log.warn("Ledger cashback wallet lookup failed, using fallback rewards budget pool", e);
        }
        return BigDecimal.valueOf(500.00);
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

    private void populateStreakInfo(RewardWallet wallet) {
        if (wallet == null || wallet.getUserId() == null) return;
        List<DailyCheckin> checkins = dailyCheckinRepository.findByUserIdOrderByCheckinDateDesc(wallet.getUserId());
        if (checkins == null || checkins.isEmpty()) {
            wallet.setCheckinStreak(0);
            wallet.setClaimedToday(false);
            return;
        }

        Set<LocalDate> uniqueDates = new HashSet<>();
        for (DailyCheckin c : checkins) {
            if (c.getCheckinDate() != null) {
                uniqueDates.add(c.getCheckinDate());
            }
        }

        LocalDate today = LocalDate.now();
        boolean claimedToday = uniqueDates.contains(today);
        wallet.setClaimedToday(claimedToday);

        LocalDate curr = claimedToday ? today : today.minusDays(1);
        int streakCount = 0;

        while (uniqueDates.contains(curr)) {
            streakCount++;
            curr = curr.minusDays(1);
        }

        wallet.setCheckinStreak(streakCount);

        boolean spunToday = wallet.getLastSpinDate() != null && wallet.getLastSpinDate().equals(today);
        wallet.setSpunToday(spunToday);
    }

    @Override
    @Transactional
    public RewardWallet getOrCreateWallet(UUID userId) {
        RewardWallet wallet = walletRepository.findById(userId)
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
        populateStreakInfo(wallet);
        return wallet;
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

        // Calculate new streak count
        List<DailyCheckin> checkins = dailyCheckinRepository.findByUserIdOrderByCheckinDateDesc(userId);
        int currentStreak = 0;
        if (checkins != null && !checkins.isEmpty()) {
            LocalDate lastDate = checkins.get(0).getCheckinDate();
            if (lastDate.equals(today.minusDays(1))) {
                LocalDate curr = lastDate;
                for (DailyCheckin c : checkins) {
                    if (c.getCheckinDate().equals(curr)) {
                        currentStreak++;
                        curr = curr.minusDays(1);
                    } else {
                        break;
                    }
                }
            }
        }
        int newStreak = currentStreak + 1;

        // Cashback is ONLY offered on milestone streak days: Day 10, Day 25, Day 45
        boolean isMilestone = (newStreak == 10 || newStreak == 25 || newStreak == 45);
        double dailyReward = isMilestone ? 0.50 : 0.0;
        int pointsEarned = 10;

        if (dailyReward > 0) {
            BigDecimal cashbackBal = getCashbackWalletBalance();
            if (cashbackBal.compareTo(BigDecimal.valueOf(dailyReward)) < 0) {
                writeAuditLog("DAILY_CHECKIN_FAILED", userId, cashbackBal, "FAILED", "Rewards budget exhausted. Cashback Wallet has insufficient funds.");
                throw new IllegalArgumentException("Rewards budget exhausted. Cashback Wallet has insufficient funds.");
            }
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
        if (dailyReward > 0) {
            wallet.setCashbackBalance(wallet.getCashbackBalance() + dailyReward);
            wallet.setTotalCashbackEarned(wallet.getTotalCashbackEarned() + dailyReward);
        }
        wallet.setUpdatedAt(LocalDateTime.now());
        
        updateLoyaltyLevel(wallet);
        walletRepository.save(wallet);

        if (dailyReward > 0) {
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
        }

        checkin.setCashbackEarned(dailyReward);
        checkin.setCurrentStreak(newStreak);

        return checkin;
    }

    @Override
    @Transactional
    public void processTransactionCashback(UUID userId, UUID transactionId, String transactionType, double amount, String category) {
        checkTreasuryHealth();
        log.info("Evaluating rewards for user: {}, type: {}, amount: {}, category: {}", userId, transactionType, amount, category);
        
        List<CashbackOffer> activeOffers = offerRepository.findByActiveTrue();
        RewardWallet wallet = getOrCreateWallet(userId);
        
        String categoryUpper = (category != null) ? category.toUpperCase() : "";
        boolean isRechargeTx = categoryUpper.contains("RECHARGE");
        boolean isBillTx = categoryUpper.contains("BILL") || categoryUpper.contains("UTIL");
        boolean isGroceryTx = categoryUpper.contains("GROCERY") || categoryUpper.contains("GROCERIES");
        boolean isEntertainmentTx = categoryUpper.contains("ENTERTAINMENT") || categoryUpper.contains("LEISURE");
        boolean isRentTx = categoryUpper.contains("RENT") || categoryUpper.contains("HOUSING");

        for (CashbackOffer offer : activeOffers) {
            String titleLower = (offer.getTitle() != null) ? offer.getTitle().toLowerCase() : "";
            String descLower = (offer.getDescription() != null) ? offer.getDescription().toLowerCase() : "";

            boolean isRechargeOffer = titleLower.contains("recharge") || "RECHARGE".equalsIgnoreCase(offer.getTransactionType());
            boolean isBillOffer = titleLower.contains("bill") || titleLower.contains("utility") || "UTILITY".equalsIgnoreCase(offer.getTransactionType());
            boolean isGroceryOffer = titleLower.contains("grocery") || descLower.contains("grocery");
            boolean isEntertainmentOffer = titleLower.contains("entertainment") || descLower.contains("entertainment") || titleLower.contains("cinema");
            boolean isRentOffer = titleLower.contains("rent") || descLower.contains("rent") || titleLower.contains("housing");

            // Strict category filtering: Each specialized offer type ONLY matches its respective transaction category
            if (isRechargeOffer) {
                if (!isRechargeTx) continue;
            } else if (isBillOffer) {
                if (!isBillTx) continue;
            } else if (isGroceryOffer) {
                if (!isGroceryTx) continue;
            } else if (isEntertainmentOffer) {
                if (!isEntertainmentTx) continue;
            } else if (isRentOffer) {
                if (!isRentTx) continue;
            } else {
                if (!offer.getTransactionType().equalsIgnoreCase(transactionType)) continue;
            }

            // 2. Minimum amount check
            if (amount < offer.getMinAmount()) {
                log.info("Transaction amount {} is less than minimum requirement {} for offer {}. Skipping.", amount, offer.getMinAmount(), offer.getTitle());
                continue;
            }

            // 3. Prevent duplicate claims: Each promotional cashback offer can be claimed ONLY ONCE per user
            List<CashbackTransaction> history = cashbackTransactionRepository.findByUserIdOrderByCreditedAtDesc(userId);
            boolean alreadyClaimed = history.stream().anyMatch(t -> offer.getId() != null && offer.getId().equals(t.getOfferId()));
            if (alreadyClaimed) {
                log.info("User {} has already claimed cashback offer {}. Skipping.", userId, offer.getTitle());
                continue;
            }

            // 4. Calculate Cashback (Percentage calculation formula: amount * (percentage / 100.0), capped by maxCashback)
            double reward = 0.0;
            if (offer.getCashbackPercentage() > 0.0) {
                reward = amount * (offer.getCashbackPercentage() / 100.0);
            } else if (offer.getFixedCashback() > 0.0) {
                reward = offer.getFixedCashback();
            }

            if (offer.getMaxCashback() > 0.0 && reward > offer.getMaxCashback()) {
                reward = offer.getMaxCashback();
            }

            if (reward <= 0.0) {
                log.info("Calculated reward is $0.00 for offer {}. Skipping.", offer.getTitle());
                continue;
            }

            BigDecimal cashbackBal = getCashbackWalletBalance();
            if (cashbackBal.compareTo(BigDecimal.valueOf(reward)) < 0) {
                writeAuditLog("CASHBACK_FAILED", userId, cashbackBal, "FAILED", "Rewards budget exhausted. Cashback Wallet has insufficient funds to cover reward of $" + reward);
                log.warn("Rewards budget exhausted. Skipping cashback of {} for transaction {}", reward, transactionId);
                break;
            }

            // 5. Crediting reward values
            wallet.setTotalCashbackEarned(wallet.getTotalCashbackEarned() + reward);
            wallet.setUpdatedAt(LocalDateTime.now());
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
            
            log.info("Successfully credited ${} cashback earned to user {}", reward, userId);

            // Auto-deposit cashback directly into user's primary spendable bank account balance
            boolean autoRedeemed = false;
            try {
                autoRedeemed = autoDepositCashback(userId, reward, wallet);
                if (autoRedeemed) {
                    log.info("Auto-deposited ${} cashback directly to primary bank account balance for user {}", reward, userId);
                    notificationService.createNotification(
                            userId,
                            "Cashback Deposited! 💵",
                            "Congratulations! $" + String.format("%.2f", reward) + " cashback earned from your transaction has been deposited directly into your primary bank account balance."
                    );
                }
            } catch (Exception ex) {
                log.error("Failed to auto-deposit cashback to primary bank account for user " + userId, ex);
            }

            if (!autoRedeemed) {
                wallet.setCashbackBalance(wallet.getCashbackBalance() + reward);
                walletRepository.save(wallet);
            }
            
            // Trigger only once per transaction for first matching offer
            break;
        }
    }

    private boolean autoDepositCashback(UUID userId, double amount, RewardWallet wallet) {
        BigDecimal cashbackBal = getCashbackWalletBalance();
        if (cashbackBal.compareTo(BigDecimal.valueOf(amount)) < 0) {
            return false;
        }

        TransactionRequest transferReq = new TransactionRequest();
        transferReq.setSourceAccountId(UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c605")); // Cashback System Wallet
        transferReq.setTargetAccountId(userId);
        transferReq.setAmount(BigDecimal.valueOf(amount));
        transferReq.setCurrency("USD");
        transferReq.setIdempotencyKey("AUTOCB_" + UUID.randomUUID().toString());
        transferReq.setCategory("CASHBACK");

        TransactionResponse response = transactionService.transfer(transferReq);
        if ("SUCCESS".equals(response.getStatus()) || "COMPLETED".equals(response.getStatus())) {
            wallet.setCashbackUsed(wallet.getCashbackUsed() + amount);
            walletRepository.save(wallet);
            return true;
        }
        return false;
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

        List<RewardWallet> allWallets = walletRepository.findAll();
        double totalRedeemed = allWallets.stream()
                .mapToDouble(RewardWallet::getCashbackUsed)
                .sum();

        double totalUnredeemedBalance = allWallets.stream()
                .mapToDouble(RewardWallet::getCashbackBalance)
                .sum();

        double rewardsBudget = 500.0;
        double remainingBudget = Math.max(0.0, rewardsBudget - totalDisbursed);

        stats.put("totalDisbursed", totalDisbursed);
        stats.put("totalRedeemed", totalRedeemed);
        stats.put("totalUnredeemedBalance", totalUnredeemedBalance);
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

        RewardWallet wallet = getOrCreateWallet(userId);
        LocalDate today = LocalDate.now();

        if ("spin_wheel".equals(gameKey)) {
            if (wallet.getLastSpinDate() != null && wallet.getLastSpinDate().equals(today)) {
                throw new IllegalArgumentException("Daily spin limit reached! You can spin the wheel ONLY ONCE (1/1) per day. Please try again tomorrow.");
            }
            wallet.setLastSpinDate(today);
        }

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

            wallet = getOrCreateWallet(userId);
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
