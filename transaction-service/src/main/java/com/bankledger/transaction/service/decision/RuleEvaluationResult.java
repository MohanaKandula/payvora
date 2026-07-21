package com.bankledger.transaction.service.decision;

public class RuleEvaluationResult {
    private String ruleId;
    private String ruleName;
    private String domain; // "TREASURY", "LEDGER", "SUPPORT", "COMPLIANCE", "INVESTMENT"
    private boolean passed;
    private String evaluatedResult; // e.g. "820.00 < 1000.00" or "Debit = Credit"
    private String severity; // "NONE", "WARNING", "CRITICAL"
    private String recommendation;

    public RuleEvaluationResult() {}

    public RuleEvaluationResult(String ruleId, String ruleName, String domain, boolean passed, String evaluatedResult, String severity, String recommendation) {
        this.ruleId = ruleId;
        this.ruleName = ruleName;
        this.domain = domain;
        this.passed = passed;
        this.evaluatedResult = evaluatedResult;
        this.severity = severity;
        this.recommendation = recommendation;
    }

    public String getRuleId() { return ruleId; }
    public void setRuleId(String ruleId) { this.ruleId = ruleId; }

    public String getRuleName() { return ruleName; }
    public void setRuleName(String ruleName) { this.ruleName = ruleName; }

    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }

    public boolean isPassed() { return passed; }
    public void setPassed(boolean passed) { this.passed = passed; }

    public String getEvaluatedResult() { return evaluatedResult; }
    public void setEvaluatedResult(String evaluatedResult) { this.evaluatedResult = evaluatedResult; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
}
