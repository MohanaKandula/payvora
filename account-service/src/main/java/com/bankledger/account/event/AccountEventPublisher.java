package com.bankledger.account.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@Slf4j
public class AccountEventPublisher {

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    public void publishAccountCreated(AccountCreatedEvent event) {
        String topic = "account.created";
        String key = event.getAccountId().toString();
        log.info("Publishing AccountCreatedEvent to topic {}: {}", topic, event);
        kafkaTemplate.send(topic, key, event);
    }

    public void publishAccountStatusChanged(AccountStatusChangedEvent event) {
        String topic = "ACTIVE".equalsIgnoreCase(event.getStatus()) ? "account.unfrozen" : "account.frozen";
        String key = event.getAccountId().toString();
        log.info("Publishing AccountStatusChangedEvent to topic {}: {}", topic, event);
        kafkaTemplate.send(topic, key, event);
    }
}
