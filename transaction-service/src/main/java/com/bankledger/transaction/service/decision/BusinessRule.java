package com.bankledger.transaction.service.decision;

public class BusinessRule {
    public enum Severity {
        HEALTHY,
        WARNING,
        CRITICAL
    }

    public enum Domain {
        TREASURY,
        LEDGER,
        SUPPORT,
        COMPLIANCE,
        INVESTMENT
    }

    private String ruleId;
    private String name;
    private String description;
    private Domain domain;
    private String metricKey;
    private String operator; // "<", ">", "==", "!="
    private double threshold;
    private Severity severityIfTriggered;
    private String recommendationTemplate;

    public BusinessRule(String ruleId, String name, String description, Domain domain,
                        String metricKey, String operator, double threshold, 
                        Severity severityIfTriggered, String recommendationTemplate) {
        this.ruleId = ruleId;
        this.name = name;
        this.description = description;
        this.domain = domain;
        this.metricKey = metricKey;
        this.operator = operator;
        this.threshold = threshold;
        this.severityIfTriggered = severityIfTriggered;
        this.recommendationTemplate = recommendationTemplate;
    }

    public String getRuleId() { return ruleId; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public Domain getDomain() { return domain; }
    public String getMetricKey() { return metricKey; }
    public String getOperator() { return operator; }
    public double getThreshold() { return threshold; }
    public Severity getSeverityIfTriggered() { return severityIfTriggered; }
    public String getRecommendationTemplate() { return recommendationTemplate; }
}
