package com.bankledger.ledger.listener;

import com.bankledger.ledger.event.AccountCreatedEvent;
import com.bankledger.ledger.event.AccountStatusChangedEvent;
import com.bankledger.ledger.model.LedgerAccount;
import com.bankledger.ledger.repository.LedgerAccountRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Component
@Slf4j
public class AccountEventListener {

    @Autowired
    private LedgerAccountRepository ledgerAccountRepository;

    @KafkaListener(topics = "account.created", groupId = "ledger-group", containerFactory = "kafkaListenerContainerFactory")
    @Transactional
    public void handleAccountCreated(AccountCreatedEvent event) {
        log.info("Received account.created event: {}", event);
        if (ledgerAccountRepository.existsById(event.getAccountId())) {
            log.warn("Account already exists in ledger DB: {}", event.getAccountId());
            return;
        }

        LedgerAccount ledgerAccount = LedgerAccount.builder()
                .id(event.getAccountId())
                .status(event.getStatus())
                .runningBalance(BigDecimal.ZERO.setScale(4))
                .currency(event.getCurrency())
                .build();

        ledgerAccountRepository.save(ledgerAccount);
        log.info("Saved local ledger account copy: {}", ledgerAccount.getId());
    }

    @KafkaListener(topics = "account.frozen", groupId = "ledger-group", containerFactory = "kafkaListenerContainerFactory")
    @Transactional
    public void handleAccountFrozen(AccountStatusChangedEvent event) {
        log.info("Received account.frozen event: {}", event);
        updateAccountStatus(event.getAccountId(), "FROZEN");
    }

    @KafkaListener(topics = "account.unfrozen", groupId = "ledger-group", containerFactory = "kafkaListenerContainerFactory")
    @Transactional
    public void handleAccountUnfrozen(AccountStatusChangedEvent event) {
        log.info("Received account.unfrozen event: {}", event);
        updateAccountStatus(event.getAccountId(), "ACTIVE");
    }

    private void updateAccountStatus(java.util.UUID accountId, String status) {
        ledgerAccountRepository.findById(accountId).ifPresentOrElse(account -> {
            account.setStatus(status);
            ledgerAccountRepository.save(account);
            log.info("Updated local account {} status to {}", accountId, status);
        }, () -> log.error("Local account not found for status update: {}", accountId));
    }
}
