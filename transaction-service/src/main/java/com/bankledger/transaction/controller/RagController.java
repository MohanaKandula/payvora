package com.bankledger.transaction.controller;

import com.bankledger.transaction.dto.RagResponseDto;
import com.bankledger.transaction.service.RagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/support/rag")
@CrossOrigin(origins = "*")
public class RagController {

    @Autowired
    private RagService ragService;

    @PostMapping("/query")
    public ResponseEntity<RagResponseDto> queryRag(@RequestBody(required = false) Map<String, Object> payload,
                                                  @RequestParam(value = "query", required = false) String paramQuery,
                                                  @RequestParam(value = "accountId", required = false) String paramAccountId,
                                                  @RequestParam(value = "isAdmin", required = false, defaultValue = "false") boolean paramIsAdmin) {
        String queryStr = "";
        String accountId = paramAccountId;
        boolean isAdmin = paramIsAdmin;

        Map<String, Object> context = new java.util.HashMap<>();

        if (payload != null) {
            if (payload.containsKey("query") && payload.get("query") != null) {
                queryStr = payload.get("query").toString();
            }
            if (payload.containsKey("accountId") && payload.get("accountId") != null) {
                accountId = payload.get("accountId").toString();
            } else if (payload.containsKey("userId") && payload.get("userId") != null) {
                accountId = payload.get("userId").toString();
            }
            if (payload.containsKey("isAdmin") && payload.get("isAdmin") != null) {
                isAdmin = Boolean.parseBoolean(payload.get("isAdmin").toString());
            }

            // Extract investigation context if provided
            if (payload.containsKey("context") && payload.get("context") instanceof Map) {
                context.putAll((Map<String, Object>) payload.get("context"));
            }
            if (payload.containsKey("selectedWallet")) context.put("selectedWallet", payload.get("selectedWallet"));
            if (payload.containsKey("selectedTransaction")) context.put("selectedTransaction", payload.get("selectedTransaction"));
            if (payload.containsKey("selectedInvestment")) context.put("selectedInvestment", payload.get("selectedInvestment"));
            if (payload.containsKey("selectedTicket")) context.put("selectedTicket", payload.get("selectedTicket"));
            if (payload.containsKey("activeTab")) context.put("activeTab", payload.get("activeTab"));
        }

        if (queryStr.isEmpty() && paramQuery != null) {
            queryStr = paramQuery;
        }

        long startTime = System.currentTimeMillis();
        String requestId = "req_" + java.util.UUID.randomUUID().toString().substring(0, 8);

        RagResponseDto response = ragService.queryRag(queryStr, accountId, isAdmin, context);

        long latencyMs = System.currentTimeMillis() - startTime;

        System.out.println("==================================================");
        System.out.println("🔥 RUNTIME API EXECUTED AT: " + java.time.LocalDateTime.now() + " | RequestID: " + requestId + " | Latency: " + latencyMs + "ms");
        System.out.println("🔥 QUERY = " + queryStr);
        System.out.println("🔥 ANSWER = " + response.getAnswer());
        System.out.println("🔥 SOURCE = " + response.getSourceDocument());
        System.out.println("🔥 CATEGORY = " + response.getCategory());
        System.out.println("==================================================");

        return ResponseEntity.ok(response);
    }
}
