package com.bankledger.transaction.client;

import com.bankledger.transaction.client.dto.LedgerTransactionRequest;
import com.bankledger.transaction.client.dto.LedgerTransactionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

@Component
@Slf4j
public class LedgerClient {

    private final RestTemplate restTemplate;
    private final String ledgerServiceUrl;

    @Autowired
    public LedgerClient(
            RestTemplate restTemplate,
            @Value("${ledger-service.url}") String ledgerServiceUrl) {
        this.restTemplate = restTemplate;
        this.ledgerServiceUrl = ledgerServiceUrl;
    }

    public LedgerTransactionResponse processTransaction(LedgerTransactionRequest request) {
        String url = ledgerServiceUrl + "/api/ledger/transaction";
        log.info("Calling Ledger Service: {} with request: {}", url, request);
        try {
            ResponseEntity<LedgerTransactionResponse> response = restTemplate.postForEntity(url, request, LedgerTransactionResponse.class);
            return response.getBody();
        } catch (HttpClientErrorException e) {
            log.error("Ledger Service HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            try {
                LedgerTransactionResponse errorResponse = e.getResponseBodyAs(LedgerTransactionResponse.class);
                if (errorResponse != null) {
                    return errorResponse;
                }
            } catch (Exception ex) {
                // ignore parsing exception
            }
            return LedgerTransactionResponse.builder()
                    .status("FAILED")
                    .transactionId(request.getTransactionId())
                    .message("Ledger error: " + e.getResponseBodyAsString())
                    .build();
        } catch (Exception e) {
            log.error("Failed to call Ledger Service", e);
            return LedgerTransactionResponse.builder()
                    .status("FAILED")
                    .transactionId(request.getTransactionId())
                    .message("Internal connection error: " + e.getMessage())
                    .build();
        }
    }

    public java.math.BigDecimal getWalletBalance(java.util.UUID walletId) {
        try {
            String url = ledgerServiceUrl + "/api/ledger/accounts/" + walletId;
            java.util.Map ledgerAcc = restTemplate.getForObject(url, java.util.Map.class);
            if (ledgerAcc != null && ledgerAcc.containsKey("runningBalance")) {
                return new java.math.BigDecimal(ledgerAcc.get("runningBalance").toString());
            }
        } catch (Exception e) {
            log.error("Failed to fetch wallet balance for {}: {}", walletId, e.getMessage());
        }
        return java.math.BigDecimal.ZERO;
    }
}
