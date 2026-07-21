package com.bankledger.transaction.controller;

import com.bankledger.transaction.model.SupportTicket;
import com.bankledger.transaction.repository.SupportTicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
@Slf4j
public class SupportTicketController {

    private final SupportTicketRepository ticketRepository;

    @PostMapping("/tickets")
    public ResponseEntity<?> createTicket(@RequestBody Map<String, Object> payload) {
        log.info("Received support ticket submission payload: {}", payload);
        try {
            String userIdStr = payload.get("userId") != null ? payload.get("userId").toString() : null;
            UUID userId;
            try {
                userId = (userIdStr != null && !userIdStr.isBlank()) 
                    ? UUID.fromString(userIdStr) 
                    : UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c600");
            } catch (Exception ex) {
                userId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c600");
            }

            SupportTicket ticket = new SupportTicket();
            ticket.setId("TCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            ticket.setUserId(userId);
            ticket.setCategory(payload.get("category") != null ? payload.get("category").toString() : "REWARDS");
            ticket.setPriority(payload.get("priority") != null ? payload.get("priority").toString() : "MEDIUM");
            ticket.setSubject(payload.get("subject") != null ? payload.get("subject").toString() : "General Doubt");
            ticket.setDescription(payload.get("description") != null ? payload.get("description").toString() : "");
            ticket.setStatus("OPEN");
            ticket.setCreatedAt(LocalDateTime.now());
            ticket.setUpdatedAt(LocalDateTime.now());

            SupportTicket saved = ticketRepository.save(ticket);
            log.info("Support ticket saved successfully with ID: {}", saved.getId());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("Failed to save support ticket", e);
            return ResponseEntity.status(500).body(Map.of("message", "Failed to submit ticket: " + e.getMessage()));
        }
    }

    @GetMapping("/tickets/user/{userIdStr}")
    public ResponseEntity<List<SupportTicket>> getUserTickets(@PathVariable String userIdStr) {
        UUID userId;
        try {
            userId = UUID.fromString(userIdStr);
        } catch (Exception e) {
            userId = UUID.fromString("e1b07221-50e5-4d76-bc34-31f41e57c600");
        }
        List<SupportTicket> tickets = ticketRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return ResponseEntity.ok(tickets);
    }

    @GetMapping("/admin/tickets")
    public ResponseEntity<List<SupportTicket>> getAllTicketsForAdmin() {
        List<SupportTicket> tickets = ticketRepository.findAllByOrderByCreatedAtDesc();
        return ResponseEntity.ok(tickets);
    }

    @PostMapping("/admin/tickets/{ticketId}/reply")
    public ResponseEntity<SupportTicket> replyToTicket(
            @PathVariable String ticketId,
            @RequestParam(required = false) String status,
            @RequestBody(required = false) String adminResponse) {
        
        log.info("Admin replying to ticket {}: status={}", ticketId, status);
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found: " + ticketId));

        if (status != null && !status.isBlank()) {
            ticket.setStatus(status.toUpperCase());
        }
        if (adminResponse != null && !adminResponse.isBlank()) {
            ticket.setAdminResponse(adminResponse.trim());
        }
        ticket.setUpdatedAt(LocalDateTime.now());

        SupportTicket updated = ticketRepository.save(ticket);
        return ResponseEntity.ok(updated);
    }
}
