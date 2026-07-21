package com.bankledger.transaction.service.decision;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
public class OperationalDecisionEngine {

    private final BusinessRuleRegistry ruleRegistry;

    @Autowired
    public OperationalDecisionEngine(BusinessRuleRegistry ruleRegistry) {
        this.ruleRegistry = ruleRegistry;
    }

    public DecisionEngineOutput evaluate(String query, Map<String, Object> context, Map<String, Object> liveTelemetry, boolean apiAvailable) {
        DecisionEngineOutput output = new DecisionEngineOutput();

        // 1. Data Freshness Timestamp
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("UTC"));
        String timestampStr = now.format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm:ss 'UTC'"));
        output.setDataTimestamp(timestampStr);

        output.setApiHealthStatus(apiAvailable ? "Available" : "Unavailable");
        output.setEvaluatedLiveValues(liveTelemetry != null ? liveTelemetry : Collections.emptyMap());

        List<RuleEvaluationResult> evaluationTable = new ArrayList<>();
        List<String> analysisSteps = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();

        if (!apiAvailable || liveTelemetry == null || liveTelemetry.isEmpty()) {
            output.setTreasuryHealth("WARNING");
            output.setLedgerHealth("WARNING");
            output.setSupportHealth("HEALTHY");
            output.setComplianceHealth("HEALTHY");
            output.setInvestmentHealth("HEALTHY");
            output.setOverallPlatformHealth("WARNING");
            output.setOperationalState("WARNING");
            output.setUsingDocFallback(true);
            output.setDecisionConfidence("MEDIUM");
            output.setConfidenceDetails("MEDIUM (Documentation Fallback - Backend Telemetry Offline)");

            analysisSteps.add("1. Attempted live API retrieval for Treasury, Ledger, Support, Compliance, and Investment subsystems.");
            analysisSteps.add("2. Backend API endpoints returned incomplete telemetry or were unreachable.");
            analysisSteps.add("3. Initiated documentation-backed operational analysis.");
            analysisSteps.add("4. System Operational State defaulted to WARNING due to telemetry gap.");

            recommendations.add("Check backend service health and verify database connectivity.");

            output.setRuleEvaluationTable(evaluationTable);
            output.setOperationalAnalysis(analysisSteps);
            output.setContextualRecommendations(recommendations);
            return output;
        }

        // Telemetry is Available
        output.setUsingDocFallback(false);
        output.setDecisionConfidence("HIGH");
        output.setConfidenceDetails("HIGH (Live Telemetry + RAG Documentation)");

        double yieldBalance = getDoubleMetric(liveTelemetry, "yieldReserveBalance", 1000.0);
        double cashbackBalance = getDoubleMetric(liveTelemetry, "cashbackReserveBalance", 100.0);
        double spendableBalance = getDoubleMetric(liveTelemetry, "spendableWalletBalance", 500.0);
        int pendingInjections = getIntMetric(liveTelemetry, "pendingInjectionsCount");
        boolean reconFailed = getBooleanMetric(liveTelemetry, "isReconciliationFailed");
        int openTickets = getIntMetric(liveTelemetry, "escalatedTicketsCount");
        int unverifiedKyc = getIntMetric(liveTelemetry, "unverifiedKycCount");
        double yieldCoverageRatio = getDoubleMetric(liveTelemetry, "yieldCoverageRatio", 1.25);

        BusinessRule.Severity treasurySev = BusinessRule.Severity.HEALTHY;
        BusinessRule.Severity ledgerSev = BusinessRule.Severity.HEALTHY;
        BusinessRule.Severity supportSev = BusinessRule.Severity.HEALTHY;
        BusinessRule.Severity complianceSev = BusinessRule.Severity.HEALTHY;
        BusinessRule.Severity investmentSev = BusinessRule.Severity.HEALTHY;

        int rulesPassedCount = 0;
        int rulesWarningCount = 0;
        int rulesCriticalCount = 0;

        for (BusinessRule rule : ruleRegistry.getRegisteredRules()) {
            boolean passed = true;
            String resultText = "";

            switch (rule.getRuleId()) {
                case "RULE-TREAS-001": {
                    double threshold = rule.getThreshold();
                    passed = yieldBalance >= threshold;
                    resultText = String.format("$%.2f %s $%.2f", yieldBalance, passed ? "≥" : "<", threshold);
                    if (!passed) {
                        double needed = threshold - yieldBalance;
                        recommendations.add(String.format(
                            "Suggested Action: Transfer $%.2f | From: Owner Treasury (0xTR-001) | To: Yield Reserve (0xYS-800) | Reason: Restore minimum safety reserve | Estimated Result: Yield Reserve $%.2f → $%.2f (Treasury Health: WARNING → HEALTHY)",
                            needed, yieldBalance, threshold
                        ));
                    }
                    break;
                }
                case "RULE-CB-001": {
                    double threshold = rule.getThreshold();
                    passed = cashbackBalance >= threshold;
                    resultText = String.format("$%.2f %s $%.2f", cashbackBalance, passed ? "≥" : "<", threshold);
                    if (!passed) {
                        double needed = threshold - cashbackBalance;
                        recommendations.add(String.format(
                            "Suggested Action: Transfer $%.2f | From: Owner Treasury (0xTR-001) | To: Cashback Reserve (0xCB-482) | Reason: Satisfy promotional liquidity threshold | Estimated Result: Cashback Reserve $%.2f → $%.2f (Treasury Health: WARNING → HEALTHY)",
                            needed, cashbackBalance, threshold
                        ));
                    }
                    break;
                }
                case "RULE-SPEND-001": {
                    double threshold = rule.getThreshold();
                    passed = spendableBalance >= threshold;
                    resultText = String.format("$%.2f %s $%.2f", spendableBalance, passed ? "≥" : "<", threshold);
                    if (!passed) {
                        double needed = threshold - spendableBalance;
                        recommendations.add(String.format("Suggested Action: Replenish $%.2f | From: Platform Revenue | To: Spendable Wallet (0xSP-100) | Reason: Restore withdrawal liquidity | Estimated Result: Spendable Balance $%.2f → $%.2f", needed, spendableBalance, threshold));
                    }
                    break;
                }
                case "RULE-INJECT-001": {
                    passed = pendingInjections == 0;
                    resultText = String.format("%d Pending Injection Request(s)", pendingInjections);
                    if (!passed) {
                        recommendations.add(String.format("Suggested Action: Authorize Pending Capital Injection | From: Owner Vault | To: Treasury Reserves | Reason: Approve pending liquidity request with Admin PIN & MFA | Estimated Result: Pending Injections %d → 0", pendingInjections));
                    }
                    break;
                }
                case "RULE-RECON-001": {
                    passed = !reconFailed;
                    resultText = passed ? "Debit = Credit (AUDIT PASSED)" : "Debit != Credit (MISMATCH DETECTED)";
                    if (!passed) {
                        recommendations.add("Suggested Action: Trigger Automated Ledger Audit (/api/treasury/reconcile) | From: System Journal | To: Ledger Core | Reason: Resolve double-entry debit/credit variance | Estimated Result: Reconciliation: DISCREPANCY → BALANCED");
                    }
                    break;
                }
                case "RULE-TICKET-001": {
                    passed = openTickets == 0;
                    resultText = String.format("%d Escalated Ticket(s)", openTickets);
                    if (!passed) {
                        recommendations.add(String.format("Suggested Action: Assign %d Escalated Support Ticket(s) | From: Unassigned Queue | To: Support Agent | Reason: Clear SLA backlog | Estimated Result: Open Escalated Tickets %d → 0", openTickets, openTickets));
                    }
                    break;
                }
                case "RULE-COMP-001": {
                    passed = unverifiedKyc == 0;
                    resultText = String.format("%d Unverified Account(s)", unverifiedKyc);
                    if (!passed) {
                        recommendations.add(String.format("Suggested Action: Review %d Pending KYC Submission(s) | From: Verification Queue | To: Compliance Desk | Reason: Clear identity compliance backlog | Estimated Result: Unverified Accounts %d → 0", unverifiedKyc, unverifiedKyc));
                    }
                    break;
                }
                case "RULE-INV-001": {
                    double threshold = rule.getThreshold();
                    passed = yieldCoverageRatio >= threshold;
                    resultText = String.format("%.2fx %s %.2fx", yieldCoverageRatio, passed ? "≥" : "<", threshold);
                    if (!passed) {
                        recommendations.add(String.format("Suggested Action: Rebalance Portfolio Assets | From: Corporate Cash | To: US T-Bills | Reason: Restore yield coverage ratio to >= 1.0x | Estimated Result: Coverage Ratio %.2fx → 1.25x", yieldCoverageRatio));
                    }
                    break;
                }
                default:
                    passed = true;
                    resultText = "PASSED";
            }

            if (passed) {
                rulesPassedCount++;
            } else {
                BusinessRule.Severity ruleSev = rule.getSeverityIfTriggered();
                if (ruleSev == BusinessRule.Severity.CRITICAL) {
                    rulesCriticalCount++;
                } else {
                    rulesWarningCount++;
                }

                switch (rule.getDomain()) {
                    case TREASURY:
                        treasurySev = maxSeverity(treasurySev, ruleSev);
                        break;
                    case LEDGER:
                        ledgerSev = maxSeverity(ledgerSev, ruleSev);
                        break;
                    case SUPPORT:
                        supportSev = maxSeverity(supportSev, ruleSev);
                        break;
                    case COMPLIANCE:
                        complianceSev = maxSeverity(complianceSev, ruleSev);
                        break;
                    case INVESTMENT:
                        investmentSev = maxSeverity(investmentSev, ruleSev);
                        break;
                }
            }

            // CRITICAL RULE: If passed, severity is NONE and recommendation is null!
            String ruleSeverity = passed ? "NONE" : rule.getSeverityIfTriggered().name();
            String ruleRecommendation = passed ? null : rule.getRecommendationTemplate();

            RuleEvaluationResult evalResult = new RuleEvaluationResult(
                    rule.getRuleId(),
                    rule.getName(),
                    rule.getDomain().name(),
                    passed,
                    resultText,
                    ruleSeverity,
                    ruleRecommendation
            );
            evaluationTable.add(evalResult);
        }

        output.setRulesEvaluated(ruleRegistry.getRegisteredRules().size());
        output.setRulesPassed(rulesPassedCount);
        output.setRulesWarning(rulesWarningCount);
        output.setRulesCritical(rulesCriticalCount);

        output.setTreasuryHealth(treasurySev.name());
        output.setLedgerHealth(ledgerSev.name());
        output.setSupportHealth(supportSev.name());
        output.setComplianceHealth(complianceSev.name());
        output.setInvestmentHealth(investmentSev.name());

        BusinessRule.Severity overallSev = maxSeverity(
                treasurySev, maxSeverity(ledgerSev, maxSeverity(supportSev, maxSeverity(complianceSev, investmentSev)))
        );

        output.setOverallPlatformHealth(overallSev.name());
        output.setOperationalState(overallSev.name());

        analysisSteps.add("1. Retrieved real-time Treasury, Ledger, Support, Compliance, and Investment metrics at " + timestampStr + ".");
        analysisSteps.add("2. Evaluated " + ruleRegistry.getRegisteredRules().size() + " enterprise business rules across 5 domain categories.");
        analysisSteps.add("3. Domain Health Breakdown: Treasury [" + treasurySev + "], Ledger [" + ledgerSev + "], Support [" + supportSev + "], Compliance [" + complianceSev + "], Investment [" + investmentSev + "].");

        if (overallSev == BusinessRule.Severity.CRITICAL) {
            analysisSteps.add("4. Critical business rule violation detected in system domains.");
            analysisSteps.add("5. Immediate administrative intervention required.");
            analysisSteps.add("6. Final Overall Platform Health = CRITICAL.");
        } else if (overallSev == BusinessRule.Severity.WARNING) {
            analysisSteps.add("4. One or more safety threshold rules failed across system domains.");
            analysisSteps.add("5. Proactive administrative rebalancing recommended for affected domains.");
            analysisSteps.add("6. Final Overall Platform Health = WARNING.");
        } else {
            analysisSteps.add("4. All enterprise safety rules passed successfully across all 5 business domains.");
            analysisSteps.add("5. System metrics satisfy optimal operational parameters with zero deficit.");
            analysisSteps.add("6. Final Overall Platform Health = HEALTHY.");
        }

        if (recommendations.isEmpty()) {
            recommendations.add("No administrator action required. All operational metrics healthy.");
        }

        output.setRuleEvaluationTable(evaluationTable);
        output.setOperationalAnalysis(analysisSteps);
        output.setContextualRecommendations(recommendations);

        return output;
    }

    private BusinessRule.Severity maxSeverity(BusinessRule.Severity a, BusinessRule.Severity b) {
        if (a == BusinessRule.Severity.CRITICAL || b == BusinessRule.Severity.CRITICAL) {
            return BusinessRule.Severity.CRITICAL;
        }
        if (a == BusinessRule.Severity.WARNING || b == BusinessRule.Severity.WARNING) {
            return BusinessRule.Severity.WARNING;
        }
        return BusinessRule.Severity.HEALTHY;
    }

    private double getDoubleMetric(Map<String, Object> map, String key, double defaultVal) {
        if (map == null || !map.containsKey(key)) return defaultVal;
        Object val = map.get(key);
        if (val instanceof Number) {
            return ((Number) val).doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(val));
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private boolean getBooleanMetric(Map<String, Object> map, String key) {
        if (map == null || !map.containsKey(key)) return false;
        Object val = map.get(key);
        if (val instanceof Boolean) return (Boolean) val;
        return "true".equalsIgnoreCase(String.valueOf(val));
    }

    private int getIntMetric(Map<String, Object> map, String key) {
        if (map == null || !map.containsKey(key)) return 0;
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).intValue();
        try {
            return Integer.parseInt(String.valueOf(val));
        } catch (Exception e) {
            return 0;
        }
    }
}
