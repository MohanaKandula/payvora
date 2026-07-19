package com.bankledger.balance;

import com.bankledger.balance.client.LedgerClient;
import com.bankledger.balance.client.dto.LedgerEntryDto;
import com.bankledger.balance.dto.BalanceDto;
import com.bankledger.balance.repository.BalanceRepository;
import com.bankledger.balance.repository.ProcessedEventRepository;
import com.bankledger.balance.service.BalanceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "spring.datasource.url=jdbc:h2:mem:balance_db;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.flyway.enabled=false"
    }
)
public class BalanceRebuildIntegrationTest {

    @Autowired
    private BalanceService balanceService;

    @Autowired
    private BalanceRepository balanceRepository;

    @Autowired
    private ProcessedEventRepository processedEventRepository;

    @MockBean
    private StringRedisTemplate redisTemplate;

    @MockBean
    private ValueOperations<String, String> valueOperations;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private LedgerClient ledgerClient;

    private UUID accountA;
    private UUID accountB;

    @BeforeEach
    void setUp() {
        balanceRepository.deleteAll();
        processedEventRepository.deleteAll();
        
        // Mock redis interactions
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        accountA = UUID.randomUUID();
        accountB = UUID.randomUUID();
    }

    @Test
    void testRebuildBalances_ReplaysLedgerEntriesSuccessfully() throws Exception {
        // Pre-stage mock entries from Ledger Service
        LedgerEntryDto entry1 = LedgerEntryDto.builder()
                .id(UUID.randomUUID())
                .transactionId(UUID.randomUUID())
                .accountId(accountA)
                .entryType("CREDIT")
                .amount(new BigDecimal("100.0000"))
                .currency("USD")
                .balanceAfter(new BigDecimal("100.0000"))
                .idempotencyKey("deposit-a")
                .createdAt(LocalDateTime.now().minusHours(2))
                .build();

        LedgerEntryDto entry2 = LedgerEntryDto.builder()
                .id(UUID.randomUUID())
                .transactionId(UUID.randomUUID())
                .accountId(accountA)
                .entryType("DEBIT")
                .amount(new BigDecimal("30.0000"))
                .currency("USD")
                .balanceAfter(new BigDecimal("70.0000"))
                .idempotencyKey("transfer-ab")
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();

        LedgerEntryDto entry3 = LedgerEntryDto.builder()
                .id(UUID.randomUUID())
                .transactionId(entry2.getTransactionId())
                .accountId(accountB)
                .entryType("CREDIT")
                .amount(new BigDecimal("30.0000"))
                .currency("USD")
                .balanceAfter(new BigDecimal("30.0000"))
                .idempotencyKey("transfer-ab")
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();

        List<LedgerEntryDto> mockEntries = Arrays.asList(entry1, entry2, entry3);
        when(ledgerClient.getAllLedgerEntries()).thenReturn(mockEntries);

        // Execute rebuild
        balanceService.rebuildBalances();

        // Assert DB status
        var balA = balanceRepository.findById(accountA).orElseThrow();
        assertEquals(0, new BigDecimal("70.0000").compareTo(balA.getCurrentBalance()));
        assertEquals(entry2.getId(), balA.getLastLedgerEntryId());

        var balB = balanceRepository.findById(accountB).orElseThrow();
        assertEquals(0, new BigDecimal("30.0000").compareTo(balB.getCurrentBalance()));
        assertEquals(entry3.getId(), balB.getLastLedgerEntryId());

        // Assert Cache writes were invoked
        ArgumentCaptor<String> jsonCaptorA = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).set(eq("balance:" + accountA), jsonCaptorA.capture(), eq(1L), eq(TimeUnit.HOURS));
        BalanceDto cachedDtoA = objectMapper.readValue(jsonCaptorA.getValue(), BalanceDto.class);
        assertEquals(0, new BigDecimal("70.0000").compareTo(cachedDtoA.getCurrentBalance()));

        ArgumentCaptor<String> jsonCaptorB = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).set(eq("balance:" + accountB), jsonCaptorB.capture(), eq(1L), eq(TimeUnit.HOURS));
        BalanceDto cachedDtoB = objectMapper.readValue(jsonCaptorB.getValue(), BalanceDto.class);
        assertEquals(0, new BigDecimal("30.0000").compareTo(cachedDtoB.getCurrentBalance()));
    }
}
