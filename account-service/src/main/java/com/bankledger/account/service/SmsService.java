package com.bankledger.account.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class SmsService {

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.phone-number:}")
    private String fromPhoneNumber;

    @PostConstruct
    public void init() {
        if (isConfigured()) {
            Twilio.init(accountSid, authToken);
            log.info("Twilio SMS service initialized successfully.");
        } else {
            log.warn("Twilio SMS credentials are not configured. Falling back to console logging.");
        }
    }

    public boolean isConfigured() {
        return accountSid != null && !accountSid.trim().isEmpty() &&
               authToken != null && !authToken.trim().isEmpty() &&
               fromPhoneNumber != null && !fromPhoneNumber.trim().isEmpty();
    }

    public void sendSms(String to, String body) {
        if (isConfigured()) {
            try {
                // Normalize recipient phone number to E.164 format
                String normalizedTo = to.trim().replaceAll("[^0-9+]", "");
                if (!normalizedTo.startsWith("+")) {
                    if (normalizedTo.length() == 10) {
                        normalizedTo = "+91" + normalizedTo; // Default to India (+91)
                    } else if (normalizedTo.length() == 12 && normalizedTo.startsWith("91")) {
                        normalizedTo = "+" + normalizedTo;
                    } else {
                        normalizedTo = "+" + normalizedTo;
                    }
                }

                log.info("Attempting to send SMS to normalized number: {}", normalizedTo);

                Message message = Message.creator(
                        new PhoneNumber(normalizedTo),
                        new PhoneNumber(fromPhoneNumber),
                        body
                ).create();
                log.info("SMS sent successfully to {}. SID: {}", normalizedTo, message.getSid());
            } catch (Exception e) {
                log.error("Failed to send SMS to {} via Twilio", to, e);
                log.info("[SMS FALLBACK] SMS body: {}", body);
            }
        } else {
            log.info("=================================================");
            log.info("[SMS LOG ONLY] Sending SMS to {}: {}", to, body);
            log.info("=================================================");
        }
    }
}
