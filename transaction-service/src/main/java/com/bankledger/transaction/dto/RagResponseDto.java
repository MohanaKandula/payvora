package com.bankledger.transaction.dto;

import java.util.List;
import java.util.Map;

public class RagResponseDto {
    private String query;
    private String answer;
    private String category;
    private String sourceDocument;
    private double relevanceScore;

    // Structured AI Operational Investigator fields
    private String purpose;
    private String howItWorks;
    private String dependencies;
    private String relatedFeatures;
    private String recommendedActions;
    private String liveMetrics;
    private String currentStatus;
    private String rootCause;
    private String operationalWorkflow;
    private String impactAnalysis;
    private String relatedComponents;
    private String visualFlow;
    private String knowledgeSources;
    private boolean investigationMode;

    // Domain-Specific Operational Health Fields
    private String treasuryHealth = "HEALTHY";
    private String ledgerHealth = "HEALTHY";
    private String supportHealth = "HEALTHY";
    private String complianceHealth = "HEALTHY";
    private String investmentHealth = "HEALTHY";
    private String overallPlatformHealth = "HEALTHY";

    // Operational Decision Engine Fields
    private String operationalState; // "HEALTHY", "WARNING", "CRITICAL"
    private Object ruleEvaluationTable; // List<RuleEvaluationResult>
    private Object operationalAnalysis; // List<String>
    private String dataTimestamp;
    private String apiHealthStatus;
    private boolean usingDocFallback;
    private String decisionConfidence;
    private String confidenceDetails;
    private Object contextualRecommendations; // List<String>

    // Executive Health Summary & Threshold Source Metadata
    private int rulesEvaluated;
    private int rulesPassed;
    private int rulesWarning;
    private int rulesCritical;
    private String thresholdSource = "Treasury Configuration";
    private String configVersion = "v3.2";
    private String lastUpdated = "21 Jul 2026";

    // Question Validation & Domain Health Summary
    private String questionValidation;
    private String domainHealthSummary;

    // RAG Intent & Debugging Telemetry Fields
    private String detectedIntents;
    private String liveApisUsed;
    private String overallConfidence;

    public RagResponseDto() {}

    public RagResponseDto(String query, String answer, String category, String sourceDocument, double relevanceScore) {
        this.query = query;
        this.answer = answer;
        this.category = category;
        this.sourceDocument = sourceDocument;
        this.relevanceScore = relevanceScore;
    }

    public RagResponseDto(String query, String answer, String category, String sourceDocument, double relevanceScore,
                          String purpose, String howItWorks, String dependencies, String relatedFeatures,
                          String recommendedActions, String liveMetrics) {
        this.query = query;
        this.answer = answer;
        this.category = category;
        this.sourceDocument = sourceDocument;
        this.relevanceScore = relevanceScore;
        this.purpose = purpose;
        this.howItWorks = howItWorks;
        this.dependencies = dependencies;
        this.relatedFeatures = relatedFeatures;
        this.recommendedActions = recommendedActions;
        this.liveMetrics = liveMetrics;
    }

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSourceDocument() { return sourceDocument; }
    public void setSourceDocument(String sourceDocument) { this.sourceDocument = sourceDocument; }

    public double getRelevanceScore() { return relevanceScore; }
    public void setRelevanceScore(double relevanceScore) { this.relevanceScore = relevanceScore; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getHowItWorks() { return howItWorks; }
    public void setHowItWorks(String howItWorks) { this.howItWorks = howItWorks; }

    public String getDependencies() { return dependencies; }
    public void setDependencies(String dependencies) { this.dependencies = dependencies; }

    public String getRelatedFeatures() { return relatedFeatures; }
    public void setRelatedFeatures(String relatedFeatures) { this.relatedFeatures = relatedFeatures; }

    public String getRecommendedActions() { return recommendedActions; }
    public void setRecommendedActions(String recommendedActions) { this.recommendedActions = recommendedActions; }

    public String getLiveMetrics() { return liveMetrics; }
    public void setLiveMetrics(String liveMetrics) { this.liveMetrics = liveMetrics; }

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

    public String getKnowledgeSources() { return knowledgeSources; }
    public void setKnowledgeSources(String knowledgeSources) { this.knowledgeSources = knowledgeSources; }

    public boolean isInvestigationMode() { return investigationMode; }
    public void setInvestigationMode(boolean investigationMode) { this.investigationMode = investigationMode; }

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

    public String getOperationalState() { return operationalState; }
    public void setOperationalState(String operationalState) { 
        this.operationalState = operationalState; 
        this.overallPlatformHealth = operationalState;
    }

    public Object getRuleEvaluationTable() { return ruleEvaluationTable; }
    public void setRuleEvaluationTable(Object ruleEvaluationTable) { this.ruleEvaluationTable = ruleEvaluationTable; }

    public Object getOperationalAnalysis() { return operationalAnalysis; }
    public void setOperationalAnalysis(Object operationalAnalysis) { this.operationalAnalysis = operationalAnalysis; }

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

    public Object getContextualRecommendations() { return contextualRecommendations; }
    public void setContextualRecommendations(Object contextualRecommendations) { this.contextualRecommendations = contextualRecommendations; }

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

    public String getDomainHealthSummary() { return domainHealthSummary; }
    public void setDomainHealthSummary(String domainHealthSummary) { this.domainHealthSummary = domainHealthSummary; }

    public String getDetectedIntents() { return detectedIntents; }
    public void setDetectedIntents(String detectedIntents) { this.detectedIntents = detectedIntents; }

    public String getLiveApisUsed() { return liveApisUsed; }
    public void setLiveApisUsed(String liveApisUsed) { this.liveApisUsed = liveApisUsed; }

    public String getOverallConfidence() { return overallConfidence; }
    public void setOverallConfidence(String overallConfidence) { this.overallConfidence = overallConfidence; }

    // Structured Savings Vault Interest & Yield Fields
    private String vaultBalance;
    private String currentApy;
    private String interestEarnedThisMonth;
    private String lastInterestCreditDate;
    private String lastInterestCreditAmount;
    private String interestFrequency = "Daily";
    private String compounding = "Daily";

    public String getVaultBalance() { return vaultBalance; }
    public void setVaultBalance(String vaultBalance) { this.vaultBalance = vaultBalance; }

    public String getCurrentApy() { return currentApy; }
    public void setCurrentApy(String currentApy) { this.currentApy = currentApy; }

    public String getInterestEarnedThisMonth() { return interestEarnedThisMonth; }
    public void setInterestEarnedThisMonth(String interestEarnedThisMonth) { this.interestEarnedThisMonth = interestEarnedThisMonth; }

    public String getLastInterestCreditDate() { return lastInterestCreditDate; }
    public void setLastInterestCreditDate(String lastInterestCreditDate) { this.lastInterestCreditDate = lastInterestCreditDate; }

    public String getLastInterestCreditAmount() { return lastInterestCreditAmount; }
    public void setLastInterestCreditAmount(String lastInterestCreditAmount) { this.lastInterestCreditAmount = lastInterestCreditAmount; }

    public String getInterestFrequency() { return interestFrequency; }
    public void setInterestFrequency(String interestFrequency) { this.interestFrequency = interestFrequency; }

    public String getCompounding() { return compounding; }
    public void setCompounding(String compounding) { this.compounding = compounding; }

    // Rich Structured UI Cards & Frontend Properties
    private Object summary;
    private List<String> steps;
    private List<String> afterDeposit;
    private String guidance;
    private Object liveData;
    private Object intent;
    private String generatedAt;

    public Object getSummary() { return summary; }
    public void setSummary(Object summary) { this.summary = summary; }

    public List<String> getSteps() { return steps; }
    public void setSteps(List<String> steps) { this.steps = steps; }

    public List<String> getAfterDeposit() { return afterDeposit; }
    public void setAfterDeposit(List<String> afterDeposit) { this.afterDeposit = afterDeposit; }

    public String getGuidance() { return guidance; }
    public void setGuidance(String guidance) { this.guidance = guidance; }

    public Object getLiveData() { return liveData; }
    public void setLiveData(Object liveData) { this.liveData = liveData; }

    public Object getIntent() { return intent; }
    public void setIntent(Object intent) { this.intent = intent; }

    public String getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(String generatedAt) { this.generatedAt = generatedAt; }
}
