package com.bankledger.balance.listener;

import com.bankledger.balance.event.TransactionCompletedEvent;
import com.bankledger.balance.service.BalanceService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class BalanceEventListener {

    @Autowired
    private BalanceService balanceService;

    @KafkaListener(topics = "transaction.completed", groupId = "balance-group", containerFactory = "kafkaListenerContainerFactory")
    public void handleTransactionCompleted(TransactionCompletedEvent event) {
        log.info("Received transaction.completed event from Kafka: {}", event);
        try {
            balanceService.processTransactionCompleted(event);
        } catch (Exception e) {
            log.error("Failed to process transaction.completed event", e);
        }
    }
}
