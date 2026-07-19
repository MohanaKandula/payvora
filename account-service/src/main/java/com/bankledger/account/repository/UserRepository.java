package com.bankledger.account.repository;

import com.bankledger.account.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    Optional<User> findByAccount_Id(UUID accountId);
    Optional<User> findByPhoneNumber(String phoneNumber);
    Optional<User> findByReferralCode(String referralCode);
    java.util.List<User> findByReferredBy(String referredBy);
}
