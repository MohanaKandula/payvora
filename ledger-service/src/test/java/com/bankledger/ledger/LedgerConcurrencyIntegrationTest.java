package com.bankledger.ledger;

import com.bankledger.ledger.dto.TransactionRequest;
import com.bankledger.ledger.dto.TransactionResponse;
import com.bankledger.ledger.model.LedgerAccount;
import com.bankledger.ledger.repository.LedgerAccountRepository;
import com.bankledger.ledger.repository.LedgerEntryRepository;
import com.bankledger.ledger.service.LedgerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.test.context.EmbeddedKafka;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "spring.datasource.url=jdbc:h2:mem:ledger_db;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.flyway.enabled=false",
        "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}"
    }
)
@EmbeddedKafka(partitions = 1, topics = { "transaction.completed" })
public class LedgerConcurrencyIntegrationTest {

    @Autowired
    private LedgerService ledgerService;

    @Autowired
    private LedgerAccountRepository ledgerAccountRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    private UUID testAccountId;

    @BeforeEach
    void setUp() {
        ledgerEntryRepository.deleteAll();
        ledgerAccountRepository.deleteAll();

        testAccountId = UUID.randomUUID();
        LedgerAccount account = LedgerAccount.builder()
                .id(testAccountId)
                .status("ACTIVE")
                .runningBalance(new BigDecimal("100.0000"))
                .currency("USD")
                .build();
        ledgerAccountRepository.save(account);
    }

    @Test
    void testConcurrentWithdrawals_PessimisticLockingPreventsOverdraft() throws InterruptedException {
        int threadCount = 5;
        BigDecimal withdrawAmount = new BigDecimal("30.0000"); // 5 * 30 = 150 (exceeds 100)
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(threadCount);

        List<Future<TransactionResponse>> futures = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            UUID txId = UUID.randomUUID();
            String idempotencyKey = "withdraw-key-" + i;
            TransactionRequest request = TransactionRequest.builder()
                    .transactionId(txId)
                    .sourceAccountId(testAccountId)
                    .amount(withdrawAmount)
                    .currency("USD")
                    .idempotencyKey(idempotencyKey)
                    .type("WITHDRAWAL")
                    .build();

            futures.add(executor.submit(() -> {
                startLatch.await();
                try {
                    return ledgerService.processTransaction(request);
                } finally {
                    endLatch.countDown();
                }
            }));
        }

        startLatch.countDown();
        endLatch.await();
        executor.shutdown();

        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger failedCount = new AtomicInteger();

        for (Future<TransactionResponse> future : futures) {
            try {
                TransactionResponse response = future.get();
                if ("SUCCESS".equals(response.getStatus())) {
                    successCount.incrementAndGet();
                } else if ("FAILED".equals(response.getStatus())) {
                    failedCount.incrementAndGet();
                }
            } catch (ExecutionException e) {
                // Ignore
            }
        }

        assertEquals(3, successCount.get(), "Exactly 3 withdrawals should succeed");
        assertEquals(2, failedCount.get(), "Exactly 2 withdrawals should fail");

        LedgerAccount finalAccount = ledgerAccountRepository.findById(testAccountId).orElseThrow();
        assertEquals(0, new BigDecimal("10.0000").compareTo(finalAccount.getRunningBalance()), 
                "Final balance should be exactly 10.00");
        assertEquals(3, ledgerEntryRepository.count(), "Exactly 3 ledger entries should be persisted");
    }

    @Test
    void testIdempotentDoubleSubmit_ReturnsCachedResult() throws InterruptedException, ExecutionException {
        UUID txId = UUID.randomUUID();
        String idempotencyKey = "idemp-key-test";
        TransactionRequest request1 = TransactionRequest.builder()
                .transactionId(txId)
                .sourceAccountId(testAccountId)
                .amount(new BigDecimal("20.0000"))
                .currency("USD")
                .idempotencyKey(idempotencyKey)
                .type("WITHDRAWAL")
                .build();

        TransactionRequest request2 = TransactionRequest.builder()
                .transactionId(txId)
                .sourceAccountId(testAccountId)
                .amount(new BigDecimal("20.0000"))
                .currency("USD")
                .idempotencyKey(idempotencyKey)
                .type("WITHDRAWAL")
                .build();

        TransactionResponse response1 = ledgerService.processTransaction(request1);
        assertEquals("SUCCESS", response1.getStatus());

        TransactionResponse response2 = ledgerService.processTransaction(request2);
        assertEquals("SUCCESS", response2.getStatus());
        assertEquals(0, response1.getSourceBalanceAfter().compareTo(response2.getSourceBalanceAfter()), 
                "Idempotent response must match first call");

        assertEquals(1, ledgerEntryRepository.count(), "Only 1 ledger entry should have been created");
    }
}
