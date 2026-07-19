package com.bankledger.transaction.controller;

import com.bankledger.transaction.dto.TreasuryHistoryDto;
import com.bankledger.transaction.service.TreasuryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/treasury/admin")
@Slf4j
public class TreasuryHistoryController {

    @Autowired
    private TreasuryService treasuryService;

    @GetMapping("/history")
    public ResponseEntity<List<TreasuryHistoryDto>> getTreasuryHistory() {
        log.info("Request received to fetch administrative system transaction history");
        return ResponseEntity.ok(treasuryService.getTreasuryHistory());
    }
}
