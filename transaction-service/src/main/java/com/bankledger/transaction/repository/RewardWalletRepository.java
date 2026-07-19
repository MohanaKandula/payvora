package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.RewardWallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface RewardWalletRepository extends JpaRepository<RewardWallet, UUID> {
}
