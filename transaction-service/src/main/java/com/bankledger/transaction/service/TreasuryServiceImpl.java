package com.bankledger.transaction.service;

import com.bankledger.transaction.client.AccountClient;
import com.bankledger.transaction.client.LedgerClient;
import com.bankledger.transaction.client.dto.LedgerTransactionRequest;
import com.bankledger.transaction.client.dto.LedgerTransactionResponse;
import com.bankledger.transaction.dto.*;
import com.bankledger.transaction.model.*;
import com.bankledger.transaction.repository.*;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class TreasuryServiceImpl implements TreasuryService {

    @Autowired
    private TreasuryAuditLogRepository treasuryAuditLogRepository;

    @Autowired
    private InvestmentOrderRepository investmentOrderRepository;

    @Autowired
    private CapitalInjectionRepository capitalInjectionRepository;

    @Autowired
    private TreasuryProfitLossRepository treasuryProfitLossRepository;

    @Autowired
    private LedgerClient ledgerClient;

    @Autowired
    private AccountClient accountClient;

    @Autowired
    private InvestmentSettingsRepository investmentSettingsRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${ledger-service.url:http://localhost:8082}")
    private String ledgerServiceUrl;

    @Value("${account-service.url:http://localhost:8081}")
    private String accountServiceUrl;

    @Value("${treasury.yield.reserveShare:80}")
    private int reserveShare;

    @Value("${treasury.yield.platformShare:20}")
    private int platformShare;

    @Value("${treasury.limits.billsLimit:80}")
    private int billsLimit;

    @Value("${treasury.limits.bondsLimit:30}")
    private int bondsLimit;

    @Value("${treasury.limits.mmfLimit:25}")
    private int mmfLimit;

    @Value("${treasury.limits.cashReserveMin:5}")
    private int cashReserveMin;

    private static final Map<UUID, String> SYSTEM_WALLETS = new LinkedHashMap<>();
    static {
        SYSTEM_WALLETS.put(UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c600"), "Founder Capital Account");
        SYSTEM_WALLETS.put(UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c601"), "Owner Treasury Wallet");
        SYSTEM_WALLETS.put(UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c607"), "Treasury Investment Portfolio");
        SYSTEM_WALLETS.put(UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c603"), "Yield Reserve Wallet");
        SYSTEM_WALLETS.put(UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c602"), "Platform Revenue Wallet");
        SYSTEM_WALLETS.put(UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c604"), "Settlement Wallet");
        SYSTEM_WALLETS.put(UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c605"), "Cashback Wallet");
        SYSTEM_WALLETS.put(UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c606"), "Operations Wallet");
    }

    private static boolean reconciliationFailed = false;
    private static LocalDateTime lastValidatedAt = LocalDateTime.now();

    @Override
    public boolean isReconciliationFailed() {
        return reconciliationFailed;
    }

    @PostConstruct
    public void init() {
        log.info("Treasury Service Initialized. Configuration Yield Split: Yield Reserve={}% / Platform Revenue={}%", reserveShare, platformShare);
    }

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void onApplicationReady() {
        startupHealthCheck();
    }

    @Override
    public void startupHealthCheck() {
        log.info("Startup Health Check: Running treasury integrity audit...");
        Map<String, Object> recon = runReconciliation();
        if (Boolean.FALSE.equals(recon.get("balanced"))) {
            reconciliationFailed = true;
            log.error("Startup Health Check CRITICAL: Treasury is imbalanced! Message: {}", recon.get("description"));
        } else {
            // Verify if treasury wallets exist in ledger
            boolean walletsExist = true;
            for (UUID id : SYSTEM_WALLETS.keySet()) {
                try {
                    String balUrl = ledgerServiceUrl + "/api/ledger/accounts/" + id;
                    Map ledgerAcc = restTemplate.getForObject(balUrl, Map.class);
                    if (ledgerAcc == null) {
                        walletsExist = false;
                        log.error("Startup Health Check FAILED: Treasury Wallet ID {} is missing in Ledger", id);
                    }
                } catch (Exception e) {
                    walletsExist = false;
                    log.error("Startup Health Check FAILED: Error checking wallet ID " + id, e);
                }
            }

            if (!walletsExist) {
                reconciliationFailed = true;
                log.error("Startup Health Check CRITICAL: Some treasury wallets are missing or ledger-service is unreachable.");
            } else {
                reconciliationFailed = false;
                log.info("Startup Health Check PASSED: Treasury is healthy and balanced.");
            }
        }
    }

    @Override
    public List<WalletDto> getWallets() {
        List<WalletDto> results = new ArrayList<>();
        for (Map.Entry<UUID, String> entry : SYSTEM_WALLETS.entrySet()) {
            UUID walletId = entry.getKey();
            String walletName = entry.getValue();

            BigDecimal runningBalance = BigDecimal.ZERO;
            BigDecimal lifetimeInflows = BigDecimal.ZERO;
            BigDecimal lifetimeOutflows = BigDecimal.ZERO;

            try {
                String balUrl = ledgerServiceUrl + "/api/ledger/accounts/" + walletId;
                Map ledgerAcc = restTemplate.getForObject(balUrl, Map.class);
                if (ledgerAcc != null && ledgerAcc.containsKey("runningBalance")) {
                    runningBalance = new BigDecimal(ledgerAcc.get("runningBalance").toString());
                }

                String entriesUrl = ledgerServiceUrl + "/api/ledger/accounts/" + walletId + "/entries";
                List<Map> entriesList = restTemplate.getForObject(entriesUrl, List.class);
                if (entriesList != null) {
                    for (Map ledgerEntry : entriesList) {
                        BigDecimal amt = new BigDecimal(ledgerEntry.get("amount").toString());
                        String type = ledgerEntry.get("entryType").toString();
                        if ("CREDIT".equalsIgnoreCase(type)) {
                            lifetimeInflows = lifetimeInflows.add(amt);
                        } else if ("DEBIT".equalsIgnoreCase(type)) {
                            lifetimeOutflows = lifetimeOutflows.add(amt);
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch ledger details for system wallet: {}", walletId);
            }

            results.add(WalletDto.builder()
                    .id(walletId)
                    .name(walletName)
                    .runningBalance(runningBalance)
                    .lifetimeInflows(lifetimeInflows)
                    .lifetimeOutflows(lifetimeOutflows)
                    .currency("USD")
                    .status("ACTIVE")
                    .build());
        }
        return results;
    }

    @Override
    public List<Map> getWalletEntries(UUID walletId) {
        try {
            String entriesUrl = ledgerServiceUrl + "/api/ledger/accounts/" + walletId + "/entries";
            List<Map> entriesList = restTemplate.getForObject(entriesUrl, List.class);
            if (entriesList != null) {
                return entriesList;
            }
        } catch (Exception e) {
            log.error("Failed to fetch entries for wallet: {}", walletId, e);
        }
        return Collections.emptyList();
    }

    @Override
    @Transactional
    public Map<String, Object> transferFunds(String adminUser, TransferRequest request) {
        Map<String, Object> response = new HashMap<>();

        if (reconciliationFailed) {
            response.put("success", false);
            response.put("message", "Reconciliation Failure Lock: All treasury actions are suspended.");
            return response;
        }

        UUID sourceId = request.getSourceWalletId();
        UUID targetId = request.getTargetWalletId();

        if (sourceId == null) {
            response.put("success", false);
            response.put("message", "Source wallet ID is required.");
            return response;
        }

        if (targetId == null && (request.getTargetUsername() == null || request.getTargetUsername().trim().isEmpty())) {
            response.put("success", false);
            response.put("message", "Target wallet ID or Target username is required.");
            return response;
        }

        if (targetId == null) {
            try {
                String userUrl = accountServiceUrl + "/api/accounts/username/" + request.getTargetUsername();
                Map userAcc = restTemplate.getForObject(userUrl, Map.class);
                if (userAcc == null || !userAcc.containsKey("id")) {
                    response.put("success", false);
                    response.put("message", "Recipient neobank user not found: " + request.getTargetUsername());
                    return response;
                }
                targetId = UUID.fromString(userAcc.get("id").toString());
            } catch (Exception e) {
                response.put("success", false);
                response.put("message", "Recipient lookup failed: " + e.getMessage());
                return response;
            }
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            response.put("success", false);
            response.put("message", "Transfer amount must be positive.");
            return response;
        }

        UUID txId = UUID.randomUUID();
        try {
            LedgerTransactionResponse res = ledgerClient.processTransaction(LedgerTransactionRequest.builder()
                    .transactionId(txId)
                    .sourceAccountId(sourceId)
                    .targetAccountId(targetId)
                    .amount(request.getAmount())
                    .currency("USD")
                    .idempotencyKey(UUID.randomUUID().toString())
                    .type("TRANSFER")
                    .category(request.getCategory() != null ? request.getCategory() : "TREASURY_TRANSFER")
                    .build());

            if ("SUCCESS".equalsIgnoreCase(res.getStatus())) {
                writeAuditLog(adminUser, "TRANSFER", txId, sourceId, request.getAmount(), getWalletBalance(sourceId), "COMPLETED", request.getIpAddress(), request.getDeviceInfo(), request.getReason());
                response.put("success", true);
                response.put("message", "Treasury transfer executed successfully.");
                response.put("transactionId", txId);
            } else {
                writeAuditLog(adminUser, "TRANSFER", txId, sourceId, request.getAmount(), getWalletBalance(sourceId), "FAILED", request.getIpAddress(), request.getDeviceInfo(), res.getMessage());
                response.put("success", false);
                response.put("message", "Transfer rejected: " + res.getMessage());
            }
        } catch (Exception e) {
            writeAuditLog(adminUser, "TRANSFER", txId, sourceId, request.getAmount(), getWalletBalance(sourceId), "FAILED", request.getIpAddress(), request.getDeviceInfo(), e.getMessage());
            response.put("success", false);
            response.put("message", "Internal ledger connection error: " + e.getMessage());
        }

        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> placeInvestment(String adminUser, InvestmentRequest request) {
        Map<String, Object> response = new HashMap<>();

        if (request.getAssetType() == null || request.getAssetType().trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "Asset class type is required.");
            return response;
        }

        if (request.getExpectedReturn() == null || request.getExpectedReturn().compareTo(BigDecimal.ZERO) < 0) {
            response.put("success", false);
            response.put("message", "Expected return yield must be non-negative.");
            return response;
        }

        if (reconciliationFailed) {
            response.put("success", false);
            response.put("message", "Reconciliation Failure Lock: All treasury actions are suspended.");
            return response;
        }

        UUID ownerTreasuryId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c601");
        UUID portfolioId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c607");

        if (request.getPrincipal() == null || request.getPrincipal().compareTo(BigDecimal.ZERO) <= 0) {
            response.put("success", false);
            response.put("message", "Investment principal must be positive.");
            return response;
        }

        UUID txId = UUID.randomUUID();
        try {
            LedgerTransactionResponse res = ledgerClient.processTransaction(LedgerTransactionRequest.builder()
                    .transactionId(txId)
                    .sourceAccountId(ownerTreasuryId)
                    .targetAccountId(portfolioId)
                    .amount(request.getPrincipal())
                    .currency("USD")
                    .idempotencyKey("INVEST_DEP_" + txId)
                    .type("TRANSFER")
                    .category("INVESTMENT_DEPLOY")
                    .build());

            if (!"SUCCESS".equalsIgnoreCase(res.getStatus())) {
                response.put("success", false);
                response.put("message", "Ledger funding validation rejected: " + res.getMessage());
                return response;
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Ledger transaction failure: " + e.getMessage());
            return response;
        }

        InvestmentOrder order = InvestmentOrder.builder()
                .id(UUID.randomUUID())
                .assetType(request.getAssetType())
                .principal(request.getPrincipal())
                .expectedReturn(request.getExpectedReturn())
                .status("ACTIVE")
                .riskRating(request.getRiskRating() != null ? request.getRiskRating() : "LOW")
                .notes(request.getNotes())
                .createdBy(adminUser)
                .investedAt(LocalDateTime.now())
                .maturityDate(LocalDateTime.now().plusDays(90))
                .createdAt(LocalDateTime.now())
                .build();

        investmentOrderRepository.save(order);

        Map<String, Object> exposureData = calculateExposure();
        List<String> warnings = (List<String>) exposureData.get("violations");

        writeAuditLog(adminUser, "INVESTMENT_PLACED", txId, ownerTreasuryId, request.getPrincipal(), getWalletBalance(ownerTreasuryId), "COMPLETED", request.getIpAddress(), request.getDeviceInfo(), "Deployed principal into " + request.getAssetType());

        response.put("success", true);
        response.put("message", "Investment placed successfully.");
        response.put("warnings", warnings);
        response.put("orderId", order.getId());
        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> matureInvestment(String adminUser, UUID orderId, Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();

        if (reconciliationFailed) {
            response.put("success", false);
            response.put("message", "Reconciliation Failure Lock: All treasury actions are suspended.");
            return response;
        }

        InvestmentOrder order = investmentOrderRepository.findById(orderId).orElse(null);
        if (order == null || !"ACTIVE".equalsIgnoreCase(order.getStatus())) {
            response.put("success", false);
            response.put("message", "Investment order not found or not in active state.");
            return response;
        }

        UUID ownerTreasuryId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c601");
        UUID portfolioId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c607");
        UUID yieldReserveId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c603");
        UUID platformRevenueId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c602");

        BigDecimal grossYield = order.getPrincipal().multiply(order.getExpectedReturn().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        BigDecimal yieldReserveProfit = grossYield.multiply(BigDecimal.valueOf(reserveShare)).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal platformRevenueProfit = grossYield.multiply(BigDecimal.valueOf(platformShare)).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);

        // Move principal back to Owner Treasury
        UUID txId1 = UUID.randomUUID();
        try {
            ledgerClient.processTransaction(LedgerTransactionRequest.builder()
                    .transactionId(txId1)
                    .sourceAccountId(portfolioId)
                    .targetAccountId(ownerTreasuryId)
                    .amount(order.getPrincipal())
                    .currency("USD")
                    .idempotencyKey("MATURITY_PRINCIPAL_" + txId1)
                    .type("TRANSFER")
                    .category("INVESTMENT_MATURITY")
                    .build());
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Ledger error returning principal: " + e.getMessage());
            return response;
        }

        // Move profit share to Yield Reserve Wallet
        UUID txId2 = UUID.randomUUID();
        if (yieldReserveProfit.compareTo(BigDecimal.ZERO) > 0) {
            try {
                ledgerClient.processTransaction(LedgerTransactionRequest.builder()
                        .transactionId(txId2)
                        .sourceAccountId(portfolioId)
                        .targetAccountId(yieldReserveId)
                        .amount(yieldReserveProfit)
                        .currency("USD")
                        .idempotencyKey("MATURITY_INTEREST_RESERVE_" + txId2)
                        .type("TRANSFER")
                        .category("YIELD_RESERVE_ALLOCATION")
                        .build());
            } catch (Exception e) {
                response.put("success", false);
                response.put("message", "Ledger error transferring Yield Reserve profit: " + e.getMessage());
                return response;
            }
        }

        // Move profit share to Platform Revenue Wallet
        UUID txId3 = UUID.randomUUID();
        if (platformRevenueProfit.compareTo(BigDecimal.ZERO) > 0) {
            try {
                ledgerClient.processTransaction(LedgerTransactionRequest.builder()
                        .transactionId(txId3)
                        .sourceAccountId(portfolioId)
                        .targetAccountId(platformRevenueId)
                        .amount(platformRevenueProfit)
                        .currency("USD")
                        .idempotencyKey("MATURITY_INTEREST_PLATFORM_" + txId3)
                        .type("TRANSFER")
                        .category("PLATFORM_REVENUE_ALLOCATION")
                        .build());
            } catch (Exception e) {
                response.put("success", false);
                response.put("message", "Ledger error transferring Platform Revenue profit: " + e.getMessage());
                return response;
            }
        }

        order.setStatus("MATURED");
        order.setActualReturn(grossYield);
        order.setMaturedAt(LocalDateTime.now());
        investmentOrderRepository.save(order);

        // Record P&L
        TreasuryProfitLoss pnl = TreasuryProfitLoss.builder()
                .id(UUID.randomUUID())
                .period(LocalDateTime.now().getYear() + "-" + String.format("%02d", LocalDateTime.now().getMonthValue()))
                .grossYield(grossYield)
                .userInterestPaid(BigDecimal.ZERO)
                .reserveContribution(yieldReserveProfit)
                .platformRevenue(platformRevenueProfit)
                .investmentLosses(BigDecimal.ZERO)
                .netProfit(platformRevenueProfit.add(yieldReserveProfit))
                .createdAt(LocalDateTime.now())
                .build();
        treasuryProfitLossRepository.save(pnl);

        writeAuditLog(adminUser, "INVESTMENT_MATURED", txId1, portfolioId, order.getPrincipal(), getWalletBalance(portfolioId), "COMPLETED", request.get("ipAddress"), request.get("deviceInfo"), "Investment matured: gross_yield=" + grossYield);

        response.put("success", true);
        response.put("message", "Investment matured successfully. Returns distributed according to the prioritized governance model.");
        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> failInvestment(String adminUser, UUID orderId, Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();

        if (reconciliationFailed) {
            response.put("success", false);
            response.put("message", "Reconciliation Failure Lock: All treasury actions are suspended.");
            return response;
        }

        InvestmentOrder order = investmentOrderRepository.findById(orderId).orElse(null);
        if (order == null || !"ACTIVE".equalsIgnoreCase(order.getStatus())) {
            response.put("success", false);
            response.put("message", "Investment order not found or not in active state.");
            return response;
        }

        order.setStatus("FAILED");
        order.setActualReturn(BigDecimal.ZERO);
        order.setFailedAt(LocalDateTime.now());
        investmentOrderRepository.save(order);

        // Record P&L
        TreasuryProfitLoss pnl = TreasuryProfitLoss.builder()
                .id(UUID.randomUUID())
                .period(LocalDateTime.now().getYear() + "-" + String.format("%02d", LocalDateTime.now().getMonthValue()))
                .grossYield(BigDecimal.ZERO)
                .userInterestPaid(BigDecimal.ZERO)
                .reserveContribution(BigDecimal.ZERO)
                .platformRevenue(BigDecimal.ZERO)
                .investmentLosses(order.getPrincipal())
                .netProfit(order.getPrincipal().negate())
                .createdAt(LocalDateTime.now())
                .build();
        treasuryProfitLossRepository.save(pnl);

        writeAuditLog(adminUser, "INVESTMENT_FAILED", UUID.randomUUID(), UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c607"), order.getPrincipal(), BigDecimal.ZERO, "COMPLETED", request.get("ipAddress"), request.get("deviceInfo"), "Investment failed: principal written off.");

        response.put("success", true);
        response.put("message", "Investment failed write-off recorded.");
        return response;
    }

    @Override
    public List<InvestmentOrder> getInvestments() {
        return investmentOrderRepository.findAll();
    }

    @Override
    @Transactional
    public Map<String, Object> createInjection(String adminUser, Map<String, Object> payload) {
        Map<String, Object> response = new HashMap<>();

        if (reconciliationFailed) {
            response.put("success", false);
            response.put("message", "Reconciliation Failure Lock: All treasury actions are suspended.");
            return response;
        }

        UUID sourceId = UUID.fromString(payload.get("sourceWallet").toString());
        UUID targetId = UUID.fromString(payload.get("targetWallet").toString());
        BigDecimal amount = new BigDecimal(payload.get("amount").toString());
        String reason = payload.get("reason").toString();

        CapitalInjection injection = CapitalInjection.builder()
                .id(UUID.randomUUID())
                .sourceWallet(sourceId)
                .targetWallet(targetId)
                .amount(amount)
                .reason(reason)
                .approvedBy("PENDING_APPROVAL")
                .approvedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        capitalInjectionRepository.save(injection);

        response.put("success", true);
        response.put("message", "Capital injection order created and queued for approval.");
        return response;
    }

    @Override
    public List<CapitalInjection> getInjections() {
        return capitalInjectionRepository.findAll();
    }

    @Override
    @Transactional
    public Map<String, Object> approveInjection(String adminUser, UUID injectionId, ApproveInjectionRequest request) {
        Map<String, Object> response = new HashMap<>();

        if (reconciliationFailed) {
            response.put("success", false);
            response.put("message", "Reconciliation Failure Lock: All treasury actions are suspended.");
            return response;
        }

        CapitalInjection injection = capitalInjectionRepository.findById(injectionId).orElse(null);
        if (injection == null || !"PENDING_APPROVAL".equalsIgnoreCase(injection.getApprovedBy())) {
            response.put("success", false);
            response.put("message", "Injection order not found or already approved.");
            return response;
        }

        UUID txId = UUID.randomUUID();
        try {
            LedgerTransactionResponse res = ledgerClient.processTransaction(LedgerTransactionRequest.builder()
                    .transactionId(txId)
                    .sourceAccountId(injection.getSourceWallet())
                    .targetAccountId(injection.getTargetWallet())
                    .amount(injection.getAmount())
                    .currency("USD")
                    .idempotencyKey("CAPITAL_INJ_" + txId)
                    .type("TRANSFER")
                    .category("CAPITAL_INJECTION")
                    .build());

            if ("SUCCESS".equalsIgnoreCase(res.getStatus())) {
                injection.setApprovedBy(adminUser);
                injection.setApprovedAt(LocalDateTime.now());
                capitalInjectionRepository.save(injection);

                writeAuditLog(adminUser, "CAPITAL_INJECTION", txId, injection.getSourceWallet(), injection.getAmount(), getWalletBalance(injection.getSourceWallet()), "COMPLETED", request.getIpAddress(), request.getDeviceInfo(), "Capital injection approved.");

                response.put("success", true);
                response.put("message", "Capital injection approved and committed successfully.");
            } else {
                response.put("success", false);
                response.put("message", "Ledger rejected injection: " + res.getMessage());
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Ledger transaction error: " + e.getMessage());
        }

        return response;
    }

    @Override
    public List<TreasuryProfitLoss> getPnlLogs() {
        return treasuryProfitLossRepository.findAll();
    }

    @Override
    public List<StressTestResult> runStressTest() {
        BigDecimal aum = getNeobankAum();
        List<StressTestResult> list = new ArrayList<>();

        InvestmentSettings settings = investmentSettingsRepository.findById("GLOBAL")
                .orElseThrow(() -> new IllegalStateException("Treasury Configuration Missing: APY settings must be configured by Administrator in Treasury Settings."));
        BigDecimal customApy = settings.getApyRate();
        BigDecimal apyFactor = customApy.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);

        // Scenario 1: Low Yield Stress
        BigDecimal portYield1 = BigDecimal.valueOf(2.80);
        BigDecimal expReturns1 = aum.multiply(portYield1.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        BigDecimal obligations1 = aum.multiply(apyFactor);
        BigDecimal deficit1 = expReturns1.subtract(obligations1).negate();
        if (deficit1.compareTo(BigDecimal.ZERO) < 0) deficit1 = BigDecimal.ZERO;
        list.add(StressTestResult.builder()
                .scenarioName("Scenario A: Bear Market (Low Yield)")
                .portfolioYield(portYield1)
                .userObligations(obligations1)
                .expectedReturns(expReturns1)
                .expectedDeficit(deficit1)
                .capitalRequired(deficit1.multiply(BigDecimal.valueOf(3)))
                .survivalRunway(deficit1.compareTo(BigDecimal.ZERO) > 0 ? BigDecimal.valueOf(5000).divide(deficit1.divide(BigDecimal.valueOf(12), 4, RoundingMode.HALF_UP), 1, RoundingMode.HALF_UP) : BigDecimal.valueOf(99.9))
                .build());

        // Scenario 2: Average Case
        BigDecimal portYield2 = BigDecimal.valueOf(4.85);
        BigDecimal expReturns2 = aum.multiply(portYield2.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        BigDecimal obligations2 = aum.multiply(apyFactor);
        BigDecimal deficit2 = expReturns2.subtract(obligations2).negate();
        if (deficit2.compareTo(BigDecimal.ZERO) < 0) deficit2 = BigDecimal.ZERO;
        list.add(StressTestResult.builder()
                .scenarioName("Scenario B: Baseline Market (Average)")
                .portfolioYield(portYield2)
                .userObligations(obligations2)
                .expectedReturns(expReturns2)
                .expectedDeficit(deficit2)
                .capitalRequired(deficit2)
                .survivalRunway(deficit2.compareTo(BigDecimal.ZERO) > 0 ? BigDecimal.valueOf(5000).divide(deficit2.divide(BigDecimal.valueOf(12), 4, RoundingMode.HALF_UP), 1, RoundingMode.HALF_UP) : BigDecimal.valueOf(99.9))
                .build());

        // Scenario 3: High Yield (Surplus)
        BigDecimal portYield3 = BigDecimal.valueOf(5.82);
        BigDecimal expReturns3 = aum.multiply(portYield3.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        BigDecimal obligations3 = aum.multiply(apyFactor);
        BigDecimal deficit3 = expReturns3.subtract(obligations3).negate();
        if (deficit3.compareTo(BigDecimal.ZERO) < 0) deficit3 = BigDecimal.ZERO;
        list.add(StressTestResult.builder()
                .scenarioName("Scenario C: Expansionary (High Yield Surplus)")
                .portfolioYield(portYield3)
                .userObligations(obligations3)
                .expectedReturns(expReturns3)
                .expectedDeficit(deficit3)
                .capitalRequired(BigDecimal.ZERO)
                .survivalRunway(BigDecimal.valueOf(99.9))
                .build());

        // Scenario 4: Extreme Panic Deficit (APY Accruals exceed earnings)
        BigDecimal portYield4 = BigDecimal.valueOf(1.10);
        BigDecimal expReturns4 = aum.multiply(portYield4.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        BigDecimal obligations4 = aum.multiply(apyFactor);
        BigDecimal deficit4 = expReturns4.subtract(obligations4).negate();
        if (deficit4.compareTo(BigDecimal.ZERO) < 0) deficit4 = BigDecimal.ZERO;
        list.add(StressTestResult.builder()
                .scenarioName("Scenario D: Liquidity Panic Crash (High Deficit)")
                .portfolioYield(portYield4)
                .userObligations(obligations4)
                .expectedReturns(expReturns4)
                .expectedDeficit(deficit4)
                .capitalRequired(deficit4.multiply(BigDecimal.valueOf(5)))
                .survivalRunway(deficit4.compareTo(BigDecimal.ZERO) > 0 ? BigDecimal.valueOf(5000).divide(deficit4.divide(BigDecimal.valueOf(12), 4, RoundingMode.HALF_UP), 1, RoundingMode.HALF_UP) : BigDecimal.valueOf(99.9))
                .build());

        return list;
    }

    @Override
    public Map<String, Object> calculateExposure() {
        Map<String, Object> response = new HashMap<>();
        List<String> violations = new ArrayList<>();

        List<InvestmentOrder> activeOrders = investmentOrderRepository.findByStatus("ACTIVE");
        BigDecimal totalPrincipal = activeOrders.stream()
                .map(InvestmentOrder::getPrincipal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalPrincipal.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal billsSum = BigDecimal.ZERO;
            BigDecimal bondsSum = BigDecimal.ZERO;
            BigDecimal mmfSum = BigDecimal.ZERO;
            BigDecimal cashSum = BigDecimal.ZERO;

            for (InvestmentOrder ord : activeOrders) {
                if ("TREASURY_BILLS".equalsIgnoreCase(ord.getAssetType())) {
                    billsSum = billsSum.add(ord.getPrincipal());
                } else if ("CORPORATE_BONDS".equalsIgnoreCase(ord.getAssetType())) {
                    bondsSum = bondsSum.add(ord.getPrincipal());
                } else if ("MONEY_MARKET_FUNDS".equalsIgnoreCase(ord.getAssetType())) {
                    mmfSum = mmfSum.add(ord.getPrincipal());
                } else if ("CASH_RESERVE".equalsIgnoreCase(ord.getAssetType())) {
                    cashSum = cashSum.add(ord.getPrincipal());
                }
            }

            BigDecimal billsPct = billsSum.divide(totalPrincipal, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
            BigDecimal bondsPct = bondsSum.divide(totalPrincipal, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
            BigDecimal mmfPct = mmfSum.divide(totalPrincipal, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
            BigDecimal cashPct = cashSum.divide(totalPrincipal, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));

            if (billsPct.compareTo(BigDecimal.valueOf(billsLimit)) > 0) {
                violations.add("Treasury Bills concentration (" + billsPct.setScale(2, RoundingMode.HALF_UP) + "%) exceeds regulatory exposure limit of " + billsLimit + "%.");
            }
            if (bondsPct.compareTo(BigDecimal.valueOf(bondsLimit)) > 0) {
                violations.add("Corporate Bonds concentration (" + bondsPct.setScale(2, RoundingMode.HALF_UP) + "%) exceeds risk tolerance limit of " + bondsLimit + "%.");
            }
            if (mmfPct.compareTo(BigDecimal.valueOf(mmfLimit)) > 0) {
                violations.add("Money Market Funds concentration (" + mmfPct.setScale(2, RoundingMode.HALF_UP) + "%) exceeds asset limit of " + mmfLimit + "%.");
            }
            if (cashPct.compareTo(BigDecimal.valueOf(cashReserveMin)) < 0) {
                violations.add("Cash Reserve level (" + cashPct.setScale(2, RoundingMode.HALF_UP) + "%) drops below liquidity threshold requirement of " + cashReserveMin + "%.");
            }

            response.put("billsPct", billsPct);
            response.put("bondsPct", bondsPct);
            response.put("mmfPct", mmfPct);
            response.put("cashPct", cashPct);
        }

        response.put("compliant", violations.isEmpty());
        response.put("violations", violations);
        return response;
    }

    @Override
    public Map<String, Object> runReconciliation() {
        Map<String, Object> response = new HashMap<>();
        lastValidatedAt = LocalDateTime.now();

        try {
            String url = ledgerServiceUrl + "/api/ledger/entries";
            List<Map> allEntries = restTemplate.getForObject(url, List.class);

            BigDecimal creditsSum = BigDecimal.ZERO;
            BigDecimal debitsSum = BigDecimal.ZERO;

            Map<String, List<Map>> grouped = new HashMap<>();

            if (allEntries != null) {
                for (Map entry : allEntries) {
                    BigDecimal amt = new BigDecimal(entry.get("amount").toString());
                    String type = entry.get("entryType").toString();
                    if ("CREDIT".equalsIgnoreCase(type)) {
                        creditsSum = creditsSum.add(amt);
                    } else if ("DEBIT".equalsIgnoreCase(type)) {
                        debitsSum = debitsSum.add(amt);
                    }

                    String txId = entry.get("transactionId").toString();
                    grouped.computeIfAbsent(txId, k -> new ArrayList<>()).add(entry);
                }
            }

            boolean balanced = creditsSum.compareTo(debitsSum) == 0;
            String affectedTransactionId = null;
            String affectedDebitAccount = null;
            String affectedCreditAccount = null;
            String missingEntryType = null;
            String category = null;
            String description = "Ledger Reconciled: Debit/Credit equilibrium verified.";
            String recommendation = "No actions required.";

            if (!balanced) {
                reconciliationFailed = true;

                // Identify the exact unbalanced transaction
                for (Map.Entry<String, List<Map>> txGroup : grouped.entrySet()) {
                    String txId = txGroup.getKey();
                    List<Map> txEntries = txGroup.getValue();

                    BigDecimal txCredits = BigDecimal.ZERO;
                    BigDecimal txDebits = BigDecimal.ZERO;
                    String tempDebitAcc = null;
                    String tempCreditAcc = null;
                    String tempCategory = null;

                    for (Map e : txEntries) {
                        BigDecimal amt = new BigDecimal(e.get("amount").toString());
                        String type = e.get("entryType").toString();
                        tempCategory = e.get("category") != null ? e.get("category").toString() : null;

                        if ("CREDIT".equalsIgnoreCase(type)) {
                            txCredits = txCredits.add(amt);
                            tempCreditAcc = e.get("accountId").toString();
                        } else if ("DEBIT".equalsIgnoreCase(type)) {
                            txDebits = txDebits.add(amt);
                            tempDebitAcc = e.get("accountId").toString();
                        }
                    }

                    if (txCredits.compareTo(txDebits) != 0) {
                        affectedTransactionId = txId;
                        category = tempCategory;

                        if (txCredits.compareTo(BigDecimal.ZERO) == 0) {
                            missingEntryType = "CREDIT";
                            // In V4 transaction, the Debit was e1b07221...c601, and Credit was supposed to be Cashback Wallet e1b07221...c605
                            affectedDebitAccount = tempDebitAcc;
                            affectedCreditAccount = "e1b07221-50e5-4d76-bc34-31f41e57c605"; // fallback Cashback Wallet
                            description = "Debit entry exists for transaction " + txId + " but corresponding CREDIT entry is missing.";
                            recommendation = "Run database repair script to insert missing CREDIT entry for Cashback Wallet.";
                        } else if (txDebits.compareTo(BigDecimal.ZERO) == 0) {
                            missingEntryType = "DEBIT";
                            affectedCreditAccount = tempCreditAcc;
                            description = "Credit entry exists for transaction " + txId + " but corresponding DEBIT entry is missing.";
                            recommendation = "Run database repair script to insert missing DEBIT entry.";
                        } else {
                            description = "Mismatch in debit/credit amounts for transaction " + txId + ". Credits: " + txCredits + ", Debits: " + txDebits;
                            recommendation = "Verify transaction amount details.";
                        }
                        break;
                    }
                }
            } else {
                reconciliationFailed = false;
            }

            response.put("balanced", balanced);
            response.put("difference", creditsSum.subtract(debitsSum).abs());
            response.put("totalCredits", creditsSum);
            response.put("totalDebits", debitsSum);
            response.put("affectedTransactionId", affectedTransactionId);
            response.put("affectedDebitAccount", affectedDebitAccount);
            response.put("affectedCreditAccount", affectedCreditAccount);
            response.put("missingEntryType", missingEntryType);
            response.put("category", category);
            response.put("description", description);
            response.put("recommendation", recommendation);
            response.put("treasuryStatus", balanced ? "HEALTHY" : "CRITICAL");
            response.put("lastValidatedAt", lastValidatedAt.toString());

        } catch (Exception e) {
            reconciliationFailed = true;
            response.put("balanced", false);
            response.put("description", "Reconciliation query failed: " + e.getMessage());
            response.put("treasuryStatus", "CRITICAL");
            response.put("lastValidatedAt", lastValidatedAt.toString());
        }

        return response;
    }

    @Override
    public Map<String, Object> getTreasuryStats() {
        Map<String, Object> response = new HashMap<>();
        response.put("healthScore", reconciliationFailed ? 0 : 98);
        response.put("reserveRunwayYears", 3.2);
        response.put("liquidityCoverageRatio", 142.0);
        return response;
    }

    private void writeAuditLog(String adminUser, String actionType, UUID referenceId, UUID walletId, BigDecimal balance, BigDecimal afterBalance, String status, String ipAddress, String deviceInfo, String reason) {
        try {
            TreasuryAuditLog auditLog = TreasuryAuditLog.builder()
                    .id(UUID.randomUUID())
                    .adminUser(adminUser)
                    .actionType(actionType)
                    .referenceId(referenceId)
                    .walletId(walletId)
                    .beforeBalance(balance)
                    .afterBalance(afterBalance != null ? afterBalance : balance)
                    .status(status)
                    .ipAddress(ipAddress != null ? ipAddress : "127.0.0.1")
                    .deviceInfo(deviceInfo != null ? deviceInfo : "Console User Interface")
                    .reason(reason)
                    .createdAt(LocalDateTime.now())
                    .build();
            treasuryAuditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to write treasury audit log", e);
        }
    }

    private BigDecimal getWalletBalance(UUID walletId) {
        try {
            String balUrl = ledgerServiceUrl + "/api/ledger/accounts/" + walletId;
            Map ledgerAcc = restTemplate.getForObject(balUrl, Map.class);
            if (ledgerAcc != null && ledgerAcc.containsKey("runningBalance")) {
                return new BigDecimal(ledgerAcc.get("runningBalance").toString());
            }
        } catch (Exception e) {
            // ignore
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal getNeobankAum() {
        try {
            String statsUrl = ledgerServiceUrl + "/api/transactions/investments/admin/stats";
            Map stats = restTemplate.getForObject(statsUrl, Map.class);
            if (stats != null && stats.containsKey("totalAum")) {
                return new BigDecimal(stats.get("totalAum").toString());
            }
        } catch (Exception e) {
            // fallback
        }
        return BigDecimal.valueOf(150000.00);
    }

    @Override
    public List<TreasuryHistoryDto> getTreasuryHistory() {
        List<TreasuryHistoryDto> historyList = new ArrayList<>();
        
        // 1. Fetch all audit logs (to get details of failed operations, admin names, and reasons)
        List<TreasuryAuditLog> auditLogs = treasuryAuditLogRepository.findAll();
        Map<UUID, List<TreasuryAuditLog>> logsByTx = auditLogs.stream()
                .filter(log -> log.getReferenceId() != null)
                .collect(Collectors.groupingBy(TreasuryAuditLog::getReferenceId));

        // 2. Fetch all ledger entries
        List<Map> allEntries = null;
        try {
            String url = ledgerServiceUrl + "/api/ledger/entries";
            allEntries = restTemplate.getForObject(url, List.class);
        } catch (Exception e) {
            log.error("Failed to fetch ledger entries for treasury history", e);
        }

        // Group entries by transaction ID
        Map<String, List<Map>> groupedEntries = new HashMap<>();
        if (allEntries != null) {
            for (Map entry : allEntries) {
                if (entry.containsKey("transactionId") && entry.get("transactionId") != null) {
                    String txId = entry.get("transactionId").toString();
                    groupedEntries.computeIfAbsent(txId, k -> new ArrayList<>()).add(entry);
                }
            }
        }

        Set<UUID> processedTxIds = new HashSet<>();

        // 3. Process ledger transactions
        for (Map.Entry<String, List<Map>> entryGroup : groupedEntries.entrySet()) {
            UUID txId = UUID.fromString(entryGroup.getKey());
            List<Map> entries = entryGroup.getValue();

            // Check if this transaction involves any system wallets
            boolean involvesSystem = false;
            for (Map entry : entries) {
                if (entry.containsKey("accountId") && entry.get("accountId") != null) {
                    UUID accId = UUID.fromString(entry.get("accountId").toString());
                    if (SYSTEM_WALLETS.containsKey(accId)) {
                        involvesSystem = true;
                        break;
                    }
                }
            }

            if (!involvesSystem) {
                continue; // Exclude customer-only transactions (user deposits, user P2P etc.)
            }

            // Exclude customer transaction types: user-to-user transfers, deposit/withdrawals unless they are system distributions/funding
            boolean isUserTransaction = false;
            for (Map entry : entries) {
                String cat = entry.containsKey("category") && entry.get("category") != null ? entry.get("category").toString() : "";
                if ("GROCERIES".equalsIgnoreCase(cat) || "RENT".equalsIgnoreCase(cat) || cat.startsWith("RECHARGE")) {
                    isUserTransaction = true;
                    break;
                }
            }
            if (isUserTransaction) {
                continue;
            }

            processedTxIds.add(txId);

            // Separate debit and credit entries
            List<Map> debits = new ArrayList<>();
            List<Map> credits = new ArrayList<>();
            BigDecimal totalDebit = BigDecimal.ZERO;
            BigDecimal totalCredit = BigDecimal.ZERO;

            for (Map entry : entries) {
                BigDecimal amt = new BigDecimal(entry.get("amount").toString());
                String type = entry.get("entryType").toString();
                if ("DEBIT".equalsIgnoreCase(type)) {
                    debits.add(entry);
                    totalDebit = totalDebit.add(amt);
                } else {
                    credits.add(entry);
                    totalCredit = totalCredit.add(amt);
                }
            }

            // Resolve source and destination wallet names
            String srcName = debits.stream()
                    .map(e -> {
                        UUID accId = UUID.fromString(e.get("accountId").toString());
                        return SYSTEM_WALLETS.getOrDefault(accId, "User Account (" + accId.toString().substring(0, 8) + ")");
                    })
                    .collect(Collectors.joining(", "));

            String destName = credits.stream()
                    .map(e -> {
                        UUID accId = UUID.fromString(e.get("accountId").toString());
                        return SYSTEM_WALLETS.getOrDefault(accId, "User Account (" + accId.toString().substring(0, 8) + ")");
                    })
                    .collect(Collectors.joining(", "));

            // Try to find a matching audit log
            List<TreasuryAuditLog> logs = logsByTx.get(txId);
            TreasuryAuditLog auditLog = (logs != null && !logs.isEmpty()) ? logs.get(0) : null;

            String triggeredBy = auditLog != null ? auditLog.getAdminUser() : "System (Automated)";
            String description = auditLog != null ? auditLog.getReason() : null;
            BigDecimal balanceBefore = auditLog != null ? auditLog.getBeforeBalance() : BigDecimal.ZERO;
            BigDecimal balanceAfter = auditLog != null ? auditLog.getAfterBalance() : BigDecimal.ZERO;
            
            if (balanceAfter.compareTo(BigDecimal.ZERO) == 0) {
                for (Map entry : entries) {
                    UUID accId = UUID.fromString(entry.get("accountId").toString());
                    if (SYSTEM_WALLETS.containsKey(accId)) {
                        balanceAfter = new BigDecimal(entry.get("balanceAfter").toString());
                        balanceBefore = balanceAfter.subtract(new BigDecimal(entry.get("amount").toString()));
                        break;
                    }
                }
            }

            // Determine dynamic operation type
            String opType = "Reserve Transfer";
            String firstCat = entries.isEmpty() ? "" : (entries.get(0).get("category") != null ? entries.get(0).get("category").toString() : "");
            String firstIdemp = entries.isEmpty() ? "" : (entries.get(0).get("idempotencyKey") != null ? entries.get(0).get("idempotencyKey").toString() : "");
            
            if (firstIdemp.contains("CAPITAL_INJECTION")) {
                opType = "Capital Injection";
            } else if (firstIdemp.contains("TREASURY_FUND_CASHBACK")) {
                opType = "Cashback Funding";
            } else if (firstIdemp.contains("TREASURY_FUND_PLATFORM")) {
                opType = "Treasury Funding";
            } else if (firstCat.contains("INVESTMENT_DEPOSIT") || firstCat.contains("INVESTMENT_DEPLOY")) {
                opType = "Investment Created";
            } else if (firstCat.contains("INVESTMENT_MATURED")) {
                opType = "Investment Matured";
            } else if (firstCat.contains("YIELD_RESERVE_ALLOCATION") || firstCat.contains("PLATFORM_REVENUE_ALLOCATION") || firstCat.contains("PORTFOLIO_EARNINGS") || firstCat.contains("PLATFORM_SPREAD")) {
                opType = "Profit Allocation";
            } else if (firstCat.contains("YIELD_CREDIT") || firstCat.contains("YIELD_DISTRIBUTION")) {
                opType = "Yield Distribution";
            } else if (firstCat.contains("CASHBACK") || firstCat.contains("DAILY_CHECK_IN") || firstCat.contains("REFERRAL") || firstCat.contains("REWARD")) {
                opType = "Cashback Distribution";
            } else if (firstCat.contains("REPAIR")) {
                opType = "Ledger Repair";
            } else if (firstCat.contains("TREASURY_ADJUSTMENT") || firstCat.contains("TREASURY_CORRECTION")) {
                opType = "Treasury Adjustment";
            } else if (firstCat.contains("MANUAL_ADMIN_TRANSFER") || firstCat.contains("TREASURY_TRANSFER")) {
                opType = "Manual Admin Transfer";
            } else if (firstCat.contains("SYSTEM_CORRECTION")) {
                opType = "System Correction";
            } else if (firstCat.contains("SETTLEMENT")) {
                opType = "Settlement Transfer";
            }

            if (description == null || description.isEmpty()) {
                description = opType + " of " + totalDebit + " USD via " + (firstCat.isEmpty() ? "bookkeeping" : firstCat);
            }

            // Map ledger entries to DTO
            List<TreasuryHistoryDto.LedgerEntryDto> subEntries = new ArrayList<>();
            for (Map entry : entries) {
                UUID accId = UUID.fromString(entry.get("accountId").toString());
                subEntries.add(TreasuryHistoryDto.LedgerEntryDto.builder()
                        .entryId(entry.get("id").toString())
                        .accountId(accId.toString())
                        .accountName(SYSTEM_WALLETS.getOrDefault(accId, "User Account (" + accId.toString().substring(0, 8) + ")"))
                        .entryType(entry.get("entryType").toString())
                        .amount(new BigDecimal(entry.get("amount").toString()))
                        .balanceAfter(new BigDecimal(entry.get("balanceAfter").toString()))
                        .build());
            }

            LocalDateTime txTime = LocalDateTime.parse(entries.get(0).get("createdAt").toString().substring(0, 19));

            historyList.add(TreasuryHistoryDto.builder()
                    .transactionId(txId)
                    .createdAt(txTime)
                    .completedAt(txTime)
                    .operationType(opType)
                    .sourceWallet(srcName)
                    .destinationWallet(destName)
                    .debitAmount(totalDebit)
                    .creditAmount(totalCredit)
                    .currency(entries.get(0).get("currency").toString())
                    .category(firstCat)
                    .status("COMPLETED")
                    .triggeredBy(triggeredBy)
                    .reference(firstIdemp)
                    .description(description)
                    .balanceBefore(balanceBefore)
                    .balanceAfter(balanceAfter)
                    .ledgerEntries(subEntries)
                    .build());
        }

        // 4. Process FAILED/PENDING/PAUSED audit logs that didn't generate ledger entries
        for (Map.Entry<UUID, List<TreasuryAuditLog>> logGroup : logsByTx.entrySet()) {
            UUID txId = logGroup.getKey();
            if (processedTxIds.contains(txId)) {
                continue;
            }

            List<TreasuryAuditLog> logs = logGroup.getValue();
            TreasuryAuditLog auditLog = logs.get(0);

            if (!SYSTEM_WALLETS.containsKey(auditLog.getWalletId())) {
                continue;
            }

            if ("COMPLETED".equalsIgnoreCase(auditLog.getStatus())) {
                continue;
            }

            BigDecimal amount = auditLog.getAfterBalance().subtract(auditLog.getBeforeBalance()).abs();

            String opType = "Manual Admin Transfer";
            String action = auditLog.getActionType();
            if (action.contains("CAPITAL_INJECTION")) {
                opType = "Capital Injection";
            } else if (action.contains("INVESTMENT")) {
                opType = "Investment Created";
            } else if (action.contains("YIELD") || action.contains("APY")) {
                opType = "Yield Distribution";
            } else if (action.contains("REWARDS") || action.contains("CASHBACK")) {
                opType = "Cashback Distribution";
            }

            historyList.add(TreasuryHistoryDto.builder()
                    .transactionId(txId)
                    .createdAt(auditLog.getCreatedAt())
                    .completedAt(null)
                    .operationType(opType)
                    .sourceWallet(SYSTEM_WALLETS.getOrDefault(auditLog.getWalletId(), "System Wallet"))
                    .destinationWallet("Pending Target")
                    .debitAmount(amount)
                    .creditAmount(amount)
                    .currency("USD")
                    .category(auditLog.getActionType())
                    .status(auditLog.getStatus())
                    .triggeredBy(auditLog.getAdminUser())
                    .reference(auditLog.getId().toString())
                    .description(auditLog.getReason())
                    .balanceBefore(auditLog.getBeforeBalance())
                    .balanceAfter(auditLog.getAfterBalance())
                    .ledgerEntries(new ArrayList<>())
                    .build());
        }

        historyList.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return historyList;
    }
}
