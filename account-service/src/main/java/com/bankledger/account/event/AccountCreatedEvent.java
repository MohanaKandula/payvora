package com.bankledger.account.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountCreatedEvent {
    private UUID eventId;
    private UUID accountId;
    private String email;
    private String fullName;
    private String status;
    private String currency;
    private LocalDateTime createdAt;
}
