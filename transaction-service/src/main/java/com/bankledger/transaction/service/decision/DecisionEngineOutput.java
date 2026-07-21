package com.bankledger.transaction.service.decision;

import java.util.List;
import java.util.Map;

public class DecisionEngineOutput {
    private String operationalState; // "HEALTHY", "WARNING", "CRITICAL"
    private List<RuleEvaluationResult> ruleEvaluationTable;
    private List<String> operationalAnalysis;
    private String dataTimestamp;
    private String apiHealthStatus; // "Available", "Unavailable"
    private boolean usingDocFallback;
    private String decisionConfidence; // "HIGH", "MEDIUM", "LOW"
    private String confidenceDetails; // "HIGH (Live Telemetry + RAG Documentation)"
    private List<String> contextualRecommendations;
    private Map<String, Object> evaluatedLiveValues;

    // Domain-Specific Health Statuses
    private String treasuryHealth = "HEALTHY";
    private String ledgerHealth = "HEALTHY";
    private String supportHealth = "HEALTHY";
    private String complianceHealth = "HEALTHY";
    private String investmentHealth = "HEALTHY";
    private String overallPlatformHealth = "HEALTHY";

    // Executive Health Summary & Threshold Source Metadata
    private int rulesEvaluated;
    private int rulesPassed;
    private int rulesWarning;
    private int rulesCritical;
    private String thresholdSource = "Treasury Configuration";
    private String configVersion = "v3.2";
    private String lastUpdated = "21 Jul 2026";

    // Operational Report Analysis & Presentation Fields
    private String questionValidation;
    private String currentStatus;
    private String rootCause;
    private String operationalWorkflow;
    private String impactAnalysis;
    private String relatedComponents;
    private String visualFlow;
    private String recommendedActions;
    private String knowledgeSources;

    public DecisionEngineOutput() {}

    public String getOperationalState() { return operationalState; }
    public void setOperationalState(String operationalState) { 
        this.operationalState = operationalState; 
        this.overallPlatformHealth = operationalState;
    }

    public String getTreasuryHealth() { return treasuryHealth; }
    public void setTreasuryHealth(String treasuryHealth) { this.treasuryHealth = treasuryHealth; }

    public String getLedgerHealth() { return ledgerHealth; }
    public void setLedgerHealth(String ledgerHealth) { this.ledgerHealth = ledgerHealth; }

    public String getSupportHealth() { return supportHealth; }
    public void setSupportHealth(String supportHealth) { this.supportHealth = supportHealth; }

    public String getComplianceHealth() { return complianceHealth; }
    public void setComplianceHealth(String complianceHealth) { this.complianceHealth = complianceHealth; }

    public String getInvestmentHealth() { return investmentHealth; }
    public void setInvestmentHealth(String investmentHealth) { this.investmentHealth = investmentHealth; }

    public String getOverallPlatformHealth() { return overallPlatformHealth; }
    public void setOverallPlatformHealth(String overallPlatformHealth) { 
        this.overallPlatformHealth = overallPlatformHealth; 
        this.operationalState = overallPlatformHealth;
    }

    public List<RuleEvaluationResult> getRuleEvaluationTable() { return ruleEvaluationTable; }
    public void setRuleEvaluationTable(List<RuleEvaluationResult> ruleEvaluationTable) { this.ruleEvaluationTable = ruleEvaluationTable; }

    public List<String> getOperationalAnalysis() { return operationalAnalysis; }
    public void setOperationalAnalysis(List<String> operationalAnalysis) { this.operationalAnalysis = operationalAnalysis; }

    public String getDataTimestamp() { return dataTimestamp; }
    public void setDataTimestamp(String dataTimestamp) { this.dataTimestamp = dataTimestamp; }

    public String getApiHealthStatus() { return apiHealthStatus; }
    public void setApiHealthStatus(String apiHealthStatus) { this.apiHealthStatus = apiHealthStatus; }

    public boolean isUsingDocFallback() { return usingDocFallback; }
    public void setUsingDocFallback(boolean usingDocFallback) { this.usingDocFallback = usingDocFallback; }

    public String getDecisionConfidence() { return decisionConfidence; }
    public void setDecisionConfidence(String decisionConfidence) { this.decisionConfidence = decisionConfidence; }

    public String getConfidenceDetails() { return confidenceDetails; }
    public void setConfidenceDetails(String confidenceDetails) { this.confidenceDetails = confidenceDetails; }

    public List<String> getContextualRecommendations() { return contextualRecommendations; }
    public void setContextualRecommendations(List<String> contextualRecommendations) { this.contextualRecommendations = contextualRecommendations; }

    public Map<String, Object> getEvaluatedLiveValues() { return evaluatedLiveValues; }
    public void setEvaluatedLiveValues(Map<String, Object> evaluatedLiveValues) { this.evaluatedLiveValues = evaluatedLiveValues; }

    public int getRulesEvaluated() { return rulesEvaluated; }
    public void setRulesEvaluated(int rulesEvaluated) { this.rulesEvaluated = rulesEvaluated; }

    public int getRulesPassed() { return rulesPassed; }
    public void setRulesPassed(int rulesPassed) { this.rulesPassed = rulesPassed; }

    public int getRulesWarning() { return rulesWarning; }
    public void setRulesWarning(int rulesWarning) { this.rulesWarning = rulesWarning; }

    public int getRulesCritical() { return rulesCritical; }
    public void setRulesCritical(int rulesCritical) { this.rulesCritical = rulesCritical; }

    public String getThresholdSource() { return thresholdSource; }
    public void setThresholdSource(String thresholdSource) { this.thresholdSource = thresholdSource; }

    public String getConfigVersion() { return configVersion; }
    public void setConfigVersion(String configVersion) { this.configVersion = configVersion; }

    public String getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(String lastUpdated) { this.lastUpdated = lastUpdated; }

    public String getQuestionValidation() { return questionValidation; }
    public void setQuestionValidation(String questionValidation) { this.questionValidation = questionValidation; }

    public String getCurrentStatus() { return currentStatus; }
    public void setCurrentStatus(String currentStatus) { this.currentStatus = currentStatus; }

    public String getRootCause() { return rootCause; }
    public void setRootCause(String rootCause) { this.rootCause = rootCause; }

    public String getOperationalWorkflow() { return operationalWorkflow; }
    public void setOperationalWorkflow(String operationalWorkflow) { this.operationalWorkflow = operationalWorkflow; }

    public String getImpactAnalysis() { return impactAnalysis; }
    public void setImpactAnalysis(String impactAnalysis) { this.impactAnalysis = impactAnalysis; }

    public String getRelatedComponents() { return relatedComponents; }
    public void setRelatedComponents(String relatedComponents) { this.relatedComponents = relatedComponents; }

    public String getVisualFlow() { return visualFlow; }
    public void setVisualFlow(String visualFlow) { this.visualFlow = visualFlow; }

    public String getRecommendedActions() { return recommendedActions; }
    public void setRecommendedActions(String recommendedActions) { this.recommendedActions = recommendedActions; }

    public String getKnowledgeSources() { return knowledgeSources; }
    public void setKnowledgeSources(String knowledgeSources) { this.knowledgeSources = knowledgeSources; }
}
