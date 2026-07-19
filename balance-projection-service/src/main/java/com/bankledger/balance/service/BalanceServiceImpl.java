package com.bankledger.balance.service;

import com.bankledger.balance.client.LedgerClient;
import com.bankledger.balance.client.dto.LedgerEntryDto;
import com.bankledger.balance.dto.BalanceDto;
import com.bankledger.balance.event.TransactionCompletedEvent;
import com.bankledger.balance.model.Balance;
import com.bankledger.balance.model.ProcessedEvent;
import com.bankledger.balance.model.SpendingAggregate;
import com.bankledger.balance.model.SpendingAggregateId;
import com.bankledger.balance.repository.BalanceRepository;
import com.bankledger.balance.repository.ProcessedEventRepository;
import com.bankledger.balance.repository.SpendingAggregateRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class BalanceServiceImpl implements BalanceService {

    @Autowired
    private BalanceRepository balanceRepository;

    @Autowired
    private ProcessedEventRepository processedEventRepository;

    @Autowired
    private SpendingAggregateRepository spendingAggregateRepository;

    @Autowired
    private LedgerClient ledgerClient;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String REDIS_KEY_PREFIX = "balance:";

    @Override
    public BalanceDto getBalance(UUID accountId) {
        String key = REDIS_KEY_PREFIX + accountId;
        
        try {
            String cachedJson = redisTemplate.opsForValue().get(key);
            if (cachedJson != null) {
                log.info("Balance cache hit for account: {}", accountId);
                return objectMapper.readValue(cachedJson, BalanceDto.class);
            }
        } catch (Exception e) {
            log.error("Failed to read balance from Redis cache", e);
        }

        log.info("Balance cache miss for account: {}. Fetching from DB.", accountId);
        Balance balance = balanceRepository.findById(accountId)
                .orElse(null);

        BalanceDto dto;
        if (balance == null) {
            dto = BalanceDto.builder()
                    .accountId(accountId)
                    .currentBalance(BigDecimal.ZERO.setScale(4))
                    .lastLedgerEntryId(new UUID(0, 0))
                    .updatedAt(LocalDateTime.now())
                    .build();
        } else {
            dto = mapToDto(balance);
        }

        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(dto), 1, TimeUnit.HOURS);
        } catch (Exception e) {
            log.error("Failed to write balance to Redis cache", e);
        }

        return dto;
    }

    @Override
    @Transactional
    public void processTransactionCompleted(TransactionCompletedEvent event) {
        log.info("Processing TransactionCompletedEvent: eventId={}, account={}", event.getEventId(), event.getAccountId());

        if (processedEventRepository.existsById(event.getEventId())) {
            log.info("Duplicate event detected: eventId={}. Ignoring.", event.getEventId());
            return;
        }

        processedEventRepository.save(ProcessedEvent.builder()
                .id(event.getEventId())
                .createdAt(LocalDateTime.now())
                .build());

        Balance balance = balanceRepository.findById(event.getAccountId())
                .orElse(Balance.builder()
                        .accountId(event.getAccountId())
                        .currentBalance(BigDecimal.ZERO.setScale(4))
                        .lastLedgerEntryId(event.getEventId())
                        .updatedAt(LocalDateTime.now())
                        .build());

        balance.setCurrentBalance(event.getBalanceAfter());
        balance.setLastLedgerEntryId(event.getTransactionId());
        balance.setUpdatedAt(LocalDateTime.now());

        balanceRepository.save(balance);
        log.info("Updated balance in DB: account={}, new_balance={}", event.getAccountId(), event.getBalanceAfter());

        // Update spending aggregates on DEBIT transactions
        if ("DEBIT".equalsIgnoreCase(event.getEntryType())) {
            String category = event.getCategory() == null || event.getCategory().trim().isEmpty()
                    ? "OTHERS"
                    : event.getCategory().toUpperCase();

            SpendingAggregateId aggregateId = new SpendingAggregateId(event.getAccountId(), category);
            SpendingAggregate aggregate = spendingAggregateRepository.findById(aggregateId)
                    .orElse(SpendingAggregate.builder()
                            .accountId(event.getAccountId())
                            .category(category)
                            .amount(BigDecimal.ZERO.setScale(4))
                            .build());

            aggregate.setAmount(aggregate.getAmount().add(event.getAmount()));
            spendingAggregateRepository.save(aggregate);
            log.info("Updated spending aggregate: account={}, category={}, total_amount={}",
                    event.getAccountId(), category, aggregate.getAmount());
        }

        String key = REDIS_KEY_PREFIX + event.getAccountId();
        try {
            BalanceDto dto = mapToDto(balance);
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(dto), 1, TimeUnit.HOURS);
        } catch (Exception e) {
            log.error("Failed to update cache on event processing", e);
        }
    }

    @Override
    @Transactional
    public void rebuildBalances() {
        log.info("Starting rebuild of balance projections from ledger...");

        List<LedgerEntryDto> entries = ledgerClient.getAllLedgerEntries();
        log.info("Fetched {} ledger entries for replay", entries.size());

        balanceRepository.deleteAll();
        processedEventRepository.deleteAll();
        spendingAggregateRepository.deleteAll();
        
        try {
            var keys = redisTemplate.keys(REDIS_KEY_PREFIX + "*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception e) {
            log.error("Failed to clear Redis keys during rebuild", e);
        }

        Map<UUID, Balance> accumulatedBalances = new HashMap<>();
        Map<SpendingAggregateId, SpendingAggregate> accumulatedSpending = new HashMap<>();

        for (LedgerEntryDto entry : entries) {
            Balance balance = accumulatedBalances.computeIfAbsent(entry.getAccountId(), id -> 
                Balance.builder()
                        .accountId(id)
                        .currentBalance(BigDecimal.ZERO.setScale(4))
                        .lastLedgerEntryId(entry.getId())
                        .updatedAt(entry.getCreatedAt())
                        .build()
            );
            balance.setCurrentBalance(entry.getBalanceAfter());
            balance.setLastLedgerEntryId(entry.getId());
            balance.setUpdatedAt(entry.getCreatedAt());

            // Rebuild spending aggregates on DEBIT entries
            if ("DEBIT".equalsIgnoreCase(entry.getEntryType())) {
                String category = entry.getCategory() == null || entry.getCategory().trim().isEmpty()
                        ? "OTHERS"
                        : entry.getCategory().toUpperCase();
                
                SpendingAggregateId aggId = new SpendingAggregateId(entry.getAccountId(), category);
                SpendingAggregate aggregate = accumulatedSpending.computeIfAbsent(aggId, id ->
                    SpendingAggregate.builder()
                            .accountId(id.getAccountId())
                            .category(id.getCategory())
                            .amount(BigDecimal.ZERO.setScale(4))
                            .build()
                );
                aggregate.setAmount(aggregate.getAmount().add(entry.getAmount()));
            }
        }

        if (!accumulatedBalances.isEmpty()) {
            balanceRepository.saveAll(accumulatedBalances.values());
            log.info("Saved {} balances to DB", accumulatedBalances.size());

            if (!accumulatedSpending.isEmpty()) {
                spendingAggregateRepository.saveAll(accumulatedSpending.values());
                log.info("Saved {} spending aggregates to DB", accumulatedSpending.size());
            }

            for (Balance b : accumulatedBalances.values()) {
                String key = REDIS_KEY_PREFIX + b.getAccountId();
                try {
                    BalanceDto dto = mapToDto(b);
                    redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(dto), 1, TimeUnit.HOURS);
                } catch (Exception e) {
                    log.error("Failed to cache balance during rebuild", e);
                }
            }
        }

        log.info("Rebuild complete. Replayed {} entries.", entries.size());
    }

    private BalanceDto mapToDto(Balance balance) {
        return BalanceDto.builder()
                .accountId(balance.getAccountId())
                .currentBalance(balance.getCurrentBalance())
                .lastLedgerEntryId(balance.getLastLedgerEntryId())
                .updatedAt(balance.getUpdatedAt())
                .build();
    }
}
