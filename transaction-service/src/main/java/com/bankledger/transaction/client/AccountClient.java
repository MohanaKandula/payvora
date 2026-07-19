package com.bankledger.transaction.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@Slf4j
public class AccountClient {

    private final RestTemplate restTemplate;
    private final String accountServiceUrl;

    @Autowired
    public AccountClient(
            RestTemplate restTemplate,
            @Value("${account-service.url}") String accountServiceUrl) {
        this.restTemplate = restTemplate;
        this.accountServiceUrl = accountServiceUrl;
    }

    public boolean verifyTransferMfa(String username, String code) {
        String url = accountServiceUrl + "/api/accounts/mfa/verify-transfer";
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(url)
                .queryParam("username", username)
                .queryParam("code", code);
        
        log.info("Calling Account Service verifyTransferMfa: username={}, code={}", username, code);
        try {
            ResponseEntity<Boolean> response = restTemplate.postForEntity(builder.toUriString(), null, Boolean.class);
            return Boolean.TRUE.equals(response.getBody());
        } catch (Exception e) {
            log.error("Failed to verify MFA code with Account Service", e);
            return false;
        }
    }

    public String getKycStatus(java.util.UUID accountId) {
        String url = accountServiceUrl + "/api/accounts/" + accountId.toString();
        log.info("Calling Account Service to check KYC status for account: {}", accountId);
        try {
            java.util.Map response = restTemplate.getForObject(url, java.util.Map.class);
            if (response != null && response.containsKey("kycStatus")) {
                return response.get("kycStatus").toString();
            }
        } catch (Exception e) {
            log.error("Failed to fetch KYC status for account " + accountId, e);
        }
        return "NOT_STARTED";
    }

    public boolean verifyTransactionPin(String username, String pin) {
        String url = accountServiceUrl + "/api/accounts/pin/verify";
        org.springframework.web.util.UriComponentsBuilder builder = org.springframework.web.util.UriComponentsBuilder.fromHttpUrl(url)
                .queryParam("username", username)
                .queryParam("pin", pin);
        
        log.info("Calling Account Service verifyTransactionPin: username={}", username);
        try {
            ResponseEntity<Boolean> response = restTemplate.postForEntity(builder.toUriString(), null, Boolean.class);
            return Boolean.TRUE.equals(response.getBody());
        } catch (Exception e) {
            log.error("Failed to verify transaction PIN with Account Service", e);
            return false;
        }
    }

    public String getPhoneNumber(java.util.UUID accountId) {
        String url = accountServiceUrl + "/api/accounts/" + accountId.toString();
        log.info("Calling Account Service to get phone number for account: {}", accountId);
        try {
            java.util.Map response = restTemplate.getForObject(url, java.util.Map.class);
            if (response != null && response.containsKey("phoneNumber") && response.get("phoneNumber") != null) {
                return response.get("phoneNumber").toString();
            }
        } catch (Exception e) {
            log.error("Failed to fetch phone number for account " + accountId, e);
        }
        return null;
    }

    public java.util.Map getAccountByPhoneNumber(String phoneNumber) {
        String url = accountServiceUrl + "/api/accounts/by-phone";
        org.springframework.web.util.UriComponentsBuilder builder = org.springframework.web.util.UriComponentsBuilder.fromHttpUrl(url)
                .queryParam("phoneNumber", phoneNumber);
        
        log.info("Calling Account Service to get account by phone number: {}", phoneNumber);
        try {
            return restTemplate.getForObject(builder.toUriString(), java.util.Map.class);
        } catch (Exception e) {
            log.error("Failed to fetch account by phone number: " + phoneNumber, e);
            return null;
        }
    }

    public java.util.Map getAccountDetails(java.util.UUID accountId) {
        String url = accountServiceUrl + "/api/accounts/" + accountId.toString();
        log.info("Calling Account Service to get full account details: {}", accountId);
        try {
            return restTemplate.getForObject(url, java.util.Map.class);
        } catch (Exception e) {
            log.error("Failed to fetch account details for account " + accountId, e);
            return null;
        }
    }
}
