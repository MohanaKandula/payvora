package com.bankledger.transaction.service;

import com.bankledger.transaction.dto.RagResponseDto;

public interface RagService {
    RagResponseDto queryRag(String userQuery);
    RagResponseDto queryRag(String userQuery, String accountId, boolean isAdmin);
    RagResponseDto queryRag(String userQuery, String accountId, boolean isAdmin, java.util.Map<String, Object> context);
}
