package com.bankledger.transaction.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class TransferRequest {
    private UUID sourceWalletId;
    private UUID targetWalletId;
    private String targetUsername;
    private BigDecimal amount;
    private String adminPin;
    private String mfaCode;
    private String category;
    private String reason;
    private String ipAddress;
    private String deviceInfo;
}
