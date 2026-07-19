package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.AccountLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AccountLimitRepository extends JpaRepository<AccountLimit, UUID> {
}
