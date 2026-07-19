package com.bankledger.transaction.service;

import com.bankledger.transaction.dto.TransactionResponse;
import java.math.BigDecimal;
import java.util.UUID;

public interface RechargeService {
    TransactionResponse processRecharge(String username, UUID accountId, String phoneNumber, String operator, BigDecimal amount, String pin);
}
