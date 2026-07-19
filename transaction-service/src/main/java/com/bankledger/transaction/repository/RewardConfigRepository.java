package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.RewardConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RewardConfigRepository extends JpaRepository<RewardConfig, String> {
}
