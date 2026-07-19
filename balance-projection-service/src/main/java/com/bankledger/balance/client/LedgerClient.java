package com.bankledger.balance.client;

import com.bankledger.balance.client.dto.LedgerEntryDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;

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

    public List<LedgerEntryDto> getAllLedgerEntries() {
        String url = ledgerServiceUrl + "/api/ledger/entries";
        log.info("Calling Ledger Service to get all entries: {}", url);
        try {
            ResponseEntity<List<LedgerEntryDto>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<LedgerEntryDto>>() {}
            );
            return response.getBody();
        } catch (Exception e) {
            log.error("Failed to fetch all ledger entries from {}", url, e);
            return Collections.emptyList();
        }
    }
}
