package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.InvestmentAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InvestmentAccountRepository extends JpaRepository<InvestmentAccount, UUID> {
    List<InvestmentAccount> findByStatus(String status);
}
