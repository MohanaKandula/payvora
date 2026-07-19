package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.InvestmentSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvestmentSettingsRepository extends JpaRepository<InvestmentSettings, String> {
}
