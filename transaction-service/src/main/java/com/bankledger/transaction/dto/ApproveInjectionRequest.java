package com.bankledger.transaction.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class ApproveInjectionRequest {
    private UUID injectionId;
    private String adminPin;
    private String mfaCode;
    private String ipAddress;
    private String deviceInfo;
}
