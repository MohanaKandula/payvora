package com.bankledger.transaction.controller;

import com.bankledger.transaction.model.*;
import com.bankledger.transaction.service.RewardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/rewards")
public class RewardController {

    @Autowired
    private RewardService rewardService;

    @GetMapping("/wallet")
    public ResponseEntity<RewardWallet> getWallet(@RequestParam UUID userId) {
        return ResponseEntity.ok(rewardService.getOrCreateWallet(userId));
    }

    @PostMapping("/checkin")
    public ResponseEntity<?> claimDailyCheckin(@RequestParam UUID userId) {
        try {
            DailyCheckin checkin = rewardService.claimDailyCheckin(userId);
            return ResponseEntity.ok(checkin);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/redeem")
    public ResponseEntity<?> redeemCashback(@RequestParam UUID userId, @RequestParam double amount) {
        try {
            boolean success = rewardService.redeemCashback(userId, amount);
            if (success) {
                return ResponseEntity.ok(Map.of("message", "Cashback successfully redeemed and transferred to main wallet."));
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "Redemption failed. Check your KYC status."));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<CashbackTransaction>> getHistory(@RequestParam UUID userId) {
        return ResponseEntity.ok(rewardService.getHistory(userId));
    }

    @GetMapping("/offers")
    public ResponseEntity<List<CashbackOffer>> getOffers() {
        return ResponseEntity.ok(rewardService.getActiveOffers());
    }

    @GetMapping("/admin/offers")
    public ResponseEntity<List<CashbackOffer>> getAllOffers() {
        return ResponseEntity.ok(rewardService.getAllOffers());
    }

    @PostMapping("/admin/offers")
    public ResponseEntity<CashbackOffer> createOffer(@RequestBody CashbackOffer offer) {
        return ResponseEntity.ok(rewardService.createOffer(offer));
    }

    @PostMapping("/admin/offers/{id}/toggle")
    public ResponseEntity<CashbackOffer> toggleOffer(@PathVariable UUID id, @RequestParam boolean active) {
        return ResponseEntity.ok(rewardService.toggleOffer(id, active));
    }

    @GetMapping("/admin/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        return ResponseEntity.ok(rewardService.getAnalytics());
    }

    @PostMapping("/referral/credit")
    public ResponseEntity<Void> creditReferralReward(
            @RequestParam UUID referrerAccountId,
            @RequestParam UUID refereeAccountId) {
        rewardService.creditReferralReward(referrerAccountId, refereeAccountId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/config/{key}")
    public ResponseEntity<RewardConfig> getRewardConfig(@PathVariable String key) {
        return ResponseEntity.ok(rewardService.getRewardConfig(key));
    }

    @PostMapping("/admin/config/{key}")
    public ResponseEntity<RewardConfig> updateRewardConfig(
            @PathVariable String key,
            @RequestBody Map<String, String> body) {
        String value = body.get("value");
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Value cannot be empty");
        }
        return ResponseEntity.ok(rewardService.saveRewardConfig(key, value));
    }

    @PostMapping("/play/spin-wheel")
    public ResponseEntity<Map<String, Object>> playSpinWheel(@RequestParam UUID userId) {
        return ResponseEntity.ok(rewardService.playSpinWheel(userId));
    }

    @PostMapping("/play/scratch-card")
    public ResponseEntity<Map<String, Object>> playScratchCard(@RequestParam UUID userId) {
        return ResponseEntity.ok(rewardService.playScratchCard(userId));
    }
}
