package com.bankledger.transaction.service.decision;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class BusinessRuleRegistry {

    private final List<BusinessRule> registeredRules;

    public BusinessRuleRegistry() {
        List<BusinessRule> rules = new ArrayList<>();

        // TREASURY DOMAIN RULES
        // RULE-TREAS-001: Yield Reserve Safety Cap
        rules.add(new BusinessRule(
                "RULE-TREAS-001",
                "Yield Reserve Safety Margin",
                "Yield Reserve balance must remain at or above safety threshold to guarantee daily APY distributions.",
                BusinessRule.Domain.TREASURY,
                "yieldReserveBalance",
                "<",
                1000.0,
                BusinessRule.Severity.WARNING,
                "Transfer funds to Yield Reserve (0xYS-800) or approve pending capital injection."
        ));

        // RULE-CB-001: Cashback Reserve Minimum Threshold
        rules.add(new BusinessRule(
                "RULE-CB-001",
                "Cashback Reserve Liquidity",
                "Cashback Wallet balance must satisfy minimum liquidity threshold for promotion payouts.",
                BusinessRule.Domain.TREASURY,
                "cashbackReserveBalance",
                "<",
                100.0,
                BusinessRule.Severity.WARNING,
                "Rebalance Cashback Reserve (0xCB-482) from Founder Capital or Owner Treasury."
        ));

        // RULE-SPEND-001: Spendable Treasury Reserve Threshold
        rules.add(new BusinessRule(
                "RULE-SPEND-001",
                "Spendable Liquidity Threshold",
                "Spendable operations wallet balance must support daily withdrawal liquidity.",
                BusinessRule.Domain.TREASURY,
                "spendableWalletBalance",
                "<",
                500.0,
                BusinessRule.Severity.WARNING,
                "Replenish Spendable Wallet (0xSP-100) from Platform Revenue or Owner Treasury."
        ));

        // RULE-INJECT-001: Capital Injection Approval Backlog
        rules.add(new BusinessRule(
                "RULE-INJECT-001",
                "Pending Capital Injection Approval",
                "Requested capital injections require immediate administrator PIN & MFA verification.",
                BusinessRule.Domain.TREASURY,
                "pendingInjectionsCount",
                ">",
                0.0,
                BusinessRule.Severity.WARNING,
                "Authorize pending capital injection with Admin PIN and MFA code."
        ));

        // LEDGER DOMAIN RULES
        // RULE-RECON-001: Double-Entry Audit Integrity
        rules.add(new BusinessRule(
                "RULE-RECON-001",
                "Double-Entry Reconciliation Audit",
                "Ledger double-entry sum of total debits must equal total credits across all system wallets.",
                BusinessRule.Domain.LEDGER,
                "isReconciliationFailed",
                "==",
                1.0, // 1.0 indicates failed reconciliation
                BusinessRule.Severity.CRITICAL,
                "Trigger automated reconciliation audit and resolve debit/credit balance mismatch."
        ));

        // SUPPORT DOMAIN RULES
        // RULE-TICKET-001: Support Ticket Escalation Threshold
        rules.add(new BusinessRule(
                "RULE-TICKET-001",
                "Escalated Support Ticket Backlog",
                "High priority customer support tickets should not remain unassigned or pending review.",
                BusinessRule.Domain.SUPPORT,
                "escalatedTicketsCount",
                ">",
                0.0,
                BusinessRule.Severity.WARNING,
                "Review and assign open high-priority customer support tickets."
        ));

        // COMPLIANCE DOMAIN RULES
        // RULE-COMP-001: KYC Compliance Backlog
        rules.add(new BusinessRule(
                "RULE-COMP-001",
                "Unverified KYC Compliance Backlog",
                "High-volume accounts must be identity-verified to maintain regulatory compliance.",
                BusinessRule.Domain.COMPLIANCE,
                "unverifiedKycCount",
                ">",
                0.0,
                BusinessRule.Severity.WARNING,
                "Review and verify unverified customer KYC document submissions."
        ));

        // INVESTMENT DOMAIN RULES
        // RULE-INV-001: Investment Portfolio Yield Coverage
        rules.add(new BusinessRule(
                "RULE-INV-001",
                "Investment Portfolio Yield Coverage",
                "Gross investment portfolio yields must cover 100%+ of user APY interest obligations.",
                BusinessRule.Domain.INVESTMENT,
                "yieldCoverageRatio",
                "<",
                1.0,
                BusinessRule.Severity.WARNING,
                "Rebalance investment portfolio into higher yielding T-Bill/Corporate securities."
        ));

        this.registeredRules = Collections.unmodifiableList(rules);
    }

    public List<BusinessRule> getRegisteredRules() {
        return registeredRules;
    }
}
