package com.bankledger.transaction;

import com.bankledger.transaction.dto.RagResponseDto;
import com.bankledger.transaction.service.RagService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class RagServiceCustomerSupportTest {

    @Autowired
    private RagService ragService;

    @Test
    void test1_WalletQuestion_RetrievesWalletAndAccountDocs() {
        RagResponseDto response = ragService.queryRag("Can I have multiple wallets?");
        assertNotNull(response);
        assertTrue(response.getAnswer().toLowerCase().contains("multiple wallets") || response.getAnswer().toLowerCase().contains("spendable wallet"),
                "Answer should directly address multiple wallets support");
        assertTrue(response.getSourceDocument().contains("Wallet") || response.getSourceDocument().contains("Policy"),
                "Source document should include clean policy title");
    }

    @Test
    void test2_CashbackQuestion_RetrievesCashbackAndTransactionsDocs() {
        RagResponseDto response = ragService.queryRag("Why didn't I receive cashback?");
        assertNotNull(response);
        assertTrue(response.getAnswer().toLowerCase().contains("cashback"), "Answer should address cashback posting");
        assertTrue(response.getSourceDocument().contains("Rewards") || response.getSourceDocument().contains("Policy"),
                "Source document should include clean policy title");
    }

    @Test
    void test3_SavingsVaultQuestion_RetrievesSavingsVaultDoc() {
        RagResponseDto response = ragService.queryRag("How does Savings Vault work?");
        assertNotNull(response);
        assertTrue(response.getAnswer().toLowerCase().contains("savings vault") || response.getAnswer().toLowerCase().contains("interest"),
                "Answer should explain Savings Vault daily compounding interest");
        assertTrue(response.getSourceDocument().contains("Savings Vault Policy"),
                "Source document should include Savings Vault Policy");
    }

    @Test
    void test4_TransactionsQuestion_FailedTransferProtection() {
        RagResponseDto response = ragService.queryRag("My transfer failed but money was deducted.");
        assertNotNull(response);
        assertTrue(response.getAnswer().toLowerCase().contains("double-entry") || response.getAnswer().toLowerCase().contains("reversed") || response.getAnswer().toLowerCase().contains("deducted"),
                "Answer should explain failed transfer balance protection");
        assertTrue(response.getSourceDocument().contains("Transaction") || response.getSourceDocument().contains("Policy"),
                "Source document should include clean policy title");
    }

    @Test
    void test5_StatementsQuestion_RetrievesStatementsDoc() {
        RagResponseDto response = ragService.queryRag("How do I download my statement?");
        assertNotNull(response);
        assertTrue(response.getAnswer().toLowerCase().contains("statement") || response.getAnswer().toLowerCase().contains("pdf"),
                "Answer should explain statement generation");
        assertTrue(response.getSourceDocument().contains("Statements"), "Source document should include Account Statements Guide");
    }

    @Test
    void test6_SecurityQuestion_ForgottenPIN() {
        RagResponseDto response = ragService.queryRag("I forgot my transaction PIN.");
        assertNotNull(response);
        assertTrue(response.getAnswer().toLowerCase().contains("pin") || response.getAnswer().toLowerCase().contains("security"),
                "Answer should explain PIN reset procedure");
        assertTrue(response.getSourceDocument().contains("Security"), "Source document should include Security Policy");
    }

    @Test
    void test7_KycQuestion_RejectedKyc() {
        RagResponseDto response = ragService.queryRag("Why was my KYC rejected?");
        assertNotNull(response);
        assertTrue(response.getAnswer().toLowerCase().contains("kyc") || response.getAnswer().toLowerCase().contains("name mismatch") || response.getAnswer().toLowerCase().contains("rejected"),
                "Answer should explain common KYC rejection reasons");
        assertTrue(response.getSourceDocument().contains("Identity Verification Policy"),
                "Source document should include Identity Verification Policy");
    }

    @Test
    void test8_GoalsQuestion_CreateSavingsGoal() {
        RagResponseDto response = ragService.queryRag("How do I create a savings goal?");
        assertNotNull(response);
        assertTrue(response.getAnswer().toLowerCase().contains("goal"), "Answer should explain Savings Goal creation");
        assertTrue(response.getSourceDocument().contains("Savings Goals Policy"), "Source document should include Savings Goals Policy");
    }

    @Test
    void test9_RechargeQuestion_ElectricityBillPayment() {
        RagResponseDto response = ragService.queryRag("Can I pay electricity bills?");
        assertNotNull(response);
        assertTrue(response.getAnswer().toLowerCase().contains("electricity") || response.getAnswer().toLowerCase().contains("utility") || response.getAnswer().toLowerCase().contains("recharge"),
                "Answer should explain bill payments & recharges");
        assertTrue(response.getSourceDocument().contains("Utility Payments Guide"),
                "Source document should include Utility Payments Guide");
    }

    @Test
    void test10_LiveInterestQuestion_RetrievesVaultAndLiveApy() {
        RagResponseDto response = ragService.queryRag("How much interest did I earn this month?");
        assertNotNull(response);
        assertTrue(response.getAnswer().contains("Savings Vault Interest Summary"),
                "Answer should include structured Savings Vault Interest Summary header");
        assertNotNull(response.getVaultBalance(), "vaultBalance DTO field should be populated");
        assertNotNull(response.getCurrentApy(), "currentApy DTO field should be populated");
        assertNotNull(response.getInterestEarnedThisMonth(), "interestEarnedThisMonth DTO field should be populated");
        assertNotNull(response.getLastInterestCreditDate(), "lastInterestCreditDate DTO field should be populated");
        assertNotNull(response.getLastInterestCreditAmount(), "lastInterestCreditAmount DTO field should be populated");
        assertEquals("Daily", response.getInterestFrequency(), "interestFrequency should be Daily");
        assertEquals("Daily", response.getCompounding(), "compounding should be Daily");
        assertNotNull(response.getLiveApisUsed(), "Live APIs used telemetry should be populated");
    }

    @Test
    void test10b_InterestQuestionVariants_PersonalizedDataAndApy() {
        String[] queries = new String[]{
                "How much interest have I earned?",
                "Show my interest earnings.",
                "What is my Savings Vault interest?",
                "How much yield have I earned?",
                "When was my last interest credited?",
                "What is my current APY?"
        };

        for (String q : queries) {
            RagResponseDto res = ragService.queryRag(q);
            assertNotNull(res, "Response should not be null for query: " + q);
            assertTrue(res.getAnswer().contains("Savings Vault Interest Summary") || res.getAnswer().toLowerCase().contains("interest"),
                    "Response should explain interest calculation for query: " + q);
            assertNotNull(res.getVaultBalance(), "vaultBalance should be populated for query: " + q);
            assertNotNull(res.getCurrentApy(), "currentApy should be populated for query: " + q);
        }
    }

    @Test
    void test11_PageContextBoost_PrioritizesRewardsPageDocs() {
        Map<String, Object> context = new HashMap<>();
        context.put("currentPath", "/rewards");
        context.put("page", "Rewards Center");

        RagResponseDto response = ragService.queryRag("Why didn't I receive cashback?", "e1b07221-50e5-4d76-bc34-31f41e57c600", false, context);
        assertNotNull(response);
        assertTrue(response.getSourceDocument().contains("Rewards") || response.getSourceDocument().contains("Policy"),
                "Page context boost should prioritize cashback and rewards docs");
    }

    @Test
    void test12_VaultWithdrawalQuestion_AnswersWithdrawalPolicy() {
        RagResponseDto response = ragService.queryRag("Can I withdraw from Savings Vault now?");
        assertNotNull(response);
        assertTrue(response.getAnswer().contains("Withdraw from Savings Vault"), "Answer should include structured Withdraw from Savings Vault header");
        assertTrue(response.getAnswer().contains("No withdrawal penalty") && response.getAnswer().contains("No lock-up period"), "Answer should detail 0 lockup/penalty terms");
        assertFalse(response.getAnswer().contains("# PayVora Savings Vault & Yield Engine"), "Raw markdown document titles must NEVER be dumped");
        assertTrue(response.getSourceDocument().contains("Savings Vault Policy"), "Source document should include Savings Vault Policy");
    }

    @Test
    void test13_RentOfferRebateQuestion_AnswersRentCashbackPolicy() {
        RagResponseDto response = ragService.queryRag("Tell me about rent offer rebate");
        assertNotNull(response);
        assertTrue(response.getAnswer().toLowerCase().contains("rent") || response.getAnswer().toLowerCase().contains("rebate"),
                "Answer should explain rent payment cashback offers");
        assertTrue(response.getSourceDocument().contains("Rewards") || response.getSourceDocument().contains("Policy"),
                "Source document should include clean policy title");
    }

    @Test
    void test14_SecurityPinSetupQuestion_AnswersPinSetupPolicy() {
        RagResponseDto response = ragService.queryRag("How to do Security PIN setup?");
        assertNotNull(response);
        assertTrue(response.getAnswer().toLowerCase().contains("pin") || response.getAnswer().toLowerCase().contains("security"),
                "Answer should explain 4-digit PIN setup procedure");
        assertTrue(response.getSourceDocument().contains("Security"), "Source document should include Security Policy");
    }

    @Test
    void test15_TopicBasedRouting_CustomerVsAdmin() {
        // Customer queries starting with "Why", "Why didn't", "Why was", "How much" MUST route to Customer Support RAG even for non-admins
        String[] customerQueries = new String[]{
                "Why didn't I receive cashback?",
                "Why was my KYC rejected?",
                "Why is my transfer pending?",
                "How much interest did I earn this month?"
        };

        for (String q : customerQueries) {
            RagResponseDto res = ragService.queryRag(q, "e1b07221-50e5-4d76-bc34-31f41e57c600", false);
            assertNotNull(res);
            assertNotEquals("RBAC_RESTRICTED", res.getCategory(), "Customer query '" + q + "' must NEVER return RBAC_RESTRICTED");
            assertFalse(res.getAnswer().contains("permission to access internal banking operations"), "Customer query '" + q + "' must NEVER return RBAC error");
        }

        // Admin queries MUST route to Admin Operations Assistant when isAdmin = true
        RagResponseDto adminRes = ragService.queryRag("Why is Treasury Health showing Warning?", "e1b07221-50e5-4d76-bc34-31f41e57c600", true);
        assertNotNull(adminRes);
        assertTrue(adminRes.isInvestigationMode() || adminRes.getAnswer().toLowerCase().contains("treasury"), "Admin query must route to Admin Operations Assistant");

        // Admin queries from non-admins MUST return RBAC_RESTRICTED
        RagResponseDto nonAdminRes = ragService.queryRag("Why is Treasury Health showing Warning?", "e1b07221-50e5-4d76-bc34-31f41e57c600", false);
        assertNotNull(nonAdminRes);
        assertEquals("RBAC_RESTRICTED", nonAdminRes.getCategory());
    }

    @Test
    void test16_WalletAddMoney_PersonalizedFormat() {
        RagResponseDto response = ragService.queryRag("How do I add money to my wallet?");
        assertNotNull(response);
        assertTrue(response.getAnswer().contains("Add Money to Your Wallet"), "Answer should feature structured Add Money header");
        assertTrue(response.getAnswer().contains("Linked Bank Account") && response.getAnswer().contains("Debit Card"), "Answer should list supported funding methods");
        assertFalse(response.getAnswer().toLowerCase().contains("ach") || response.getAnswer().toLowerCase().contains("wire transfer"), "Answer should not mention unsupported ACH or wire transfers");
        assertTrue(response.getAnswer().contains("After a successful deposit"), "Answer should explain post-deposit flow");
    }

    @Test
    void test17_AllSevenSavingsVaultQueries_SynthesizedNoRawMarkdown() {
        String[] queries = new String[]{
                "Can I withdraw from Savings Vault now?",
                "How does Savings Vault work?",
                "How much interest did I earn this month?",
                "Can I transfer money from Savings Vault?",
                "Is there a withdrawal penalty?",
                "Is there a lock period?",
                "When is interest credited?"
        };

        for (String q : queries) {
            RagResponseDto res = ragService.queryRag(q);
            assertNotNull(res, "Response must not be null for: " + q);

            // 1. Synthesized banking response is returned
            assertTrue(res.getAnswer().contains("Savings Vault") || res.getAnswer().contains("Interest"),
                    "Synthesized answer expected for: " + q);

            // 2. Live account data is included
            assertTrue(res.getAnswer().contains("$504.00") || res.getAnswer().contains("4.50%") || res.getAnswer().contains("00:00 UTC"),
                    "Live data expected in answer for: " + q);

            // 3. Raw markdown headings and filenames are NEVER displayed in answer or sourceDocument
            assertFalse(res.getAnswer().contains("# PayVora Savings Vault"), "Raw heading must not be exposed for: " + q);
            assertFalse(res.getAnswer().contains("## Overview"), "Raw section title must not be exposed for: " + q);
            assertFalse(res.getAnswer().toLowerCase().contains(".md"), "Raw .md filename must not be in answer for: " + q);
            assertFalse(res.getSourceDocument().toLowerCase().contains(".md"), "Source document string must use clean policy titles without .md extension");
        }
    }

    @Test
    void test18_AllTenAddMoneyDepositVariants_SynthesizedNoRawMarkdown() {
        String[] queries = new String[]{
                "How do I add money to my wallet?",
                "deposit money",
                "deposit funds",
                "top up wallet",
                "fund my wallet",
                "add funds",
                "wallet deposit",
                "how to add money",
                "how do i add money",
                "deposit"
        };

        for (String q : queries) {
            RagResponseDto res = ragService.queryRag(q);
            assertNotNull(res, "Response should not be null for query: " + q);
            assertTrue(res.getAnswer().contains("Add Money to Your Wallet"), "Answer must feature structured Add Money header for query: " + q);
            assertTrue(res.getAnswer().contains("Linked Bank Account") && res.getAnswer().contains("Debit Card"), "Answer must list supported funding methods for query: " + q);
            assertFalse(res.getAnswer().toLowerCase().contains("ach") || res.getAnswer().toLowerCase().contains("wire transfer"), "Answer must not mention unsupported ACH or wire transfers for query: " + q);
            assertFalse(res.getAnswer().contains("PayVora Wallet & Deposit Guide"), "Raw document title must never be dumped in answer for query: " + q);
            assertFalse(res.getSourceDocument().contains("PayVora Wallet & Deposit Guide"), "Raw document title must never be dumped in sourceDocument for query: " + q);
        }
    }

    @Test
    void test19_NoLinkedBankAccount_DepositQuery_Synthesized() {
        String[] queries = new String[]{
                "I don't have a linked bank account. How can I add money?",
                "I haven't linked a bank account. How to deposit?",
                "No linked account. How do I add funds?",
                "How to top up wallet without a bank account?"
        };

        for (String q : queries) {
            RagResponseDto res = ragService.queryRag(q);
            assertNotNull(res, "Response must not be null for query: " + q);
            assertTrue(res.getAnswer().contains("No Linked Bank Account"), "Answer should detect missing linked bank account for query: " + q);
            assertTrue(res.getAnswer().contains("Linked Bank Accounts**: 0") || res.getAnswer().contains("Linked Bank Accounts: 0") || res.getAnswer().contains("Linked Bank Accounts: **0"), "Answer should report 0 linked bank accounts for query: " + q);
            assertTrue(res.getAnswer().contains("Debit Card"), "Answer should suggest alternative Debit Card option for query: " + q);
            assertFalse(res.getAnswer().toLowerCase().contains("ach") || res.getAnswer().toLowerCase().contains("wire transfer"), "Answer must not mention unsupported ACH or wire transfers for query: " + q);
            assertFalse(res.getAnswer().contains("PayVora Wallet & Deposit Guide"), "Raw document title must never be dumped in answer for query: " + q);
            assertFalse(res.getSourceDocument().toLowerCase().contains(".md"), "Source document must use clean policy title for query: " + q);
        }
    }

    @Test
    void test20_StructuredJsonResponse_FieldsValidation() {
        RagResponseDto res = ragService.queryRag("How do I add money to my wallet?");
        assertNotNull(res);
        assertNotNull(res.getSummary(), "Summary object should be present");
        assertNotNull(res.getSteps(), "Steps list should be present");
        assertNotNull(res.getAfterDeposit(), "AfterDeposit list should be present");
        assertNotNull(res.getGuidance(), "Guidance string should be present");
        assertNotNull(res.getLiveData(), "LiveData object should be present");
        assertNotNull(res.getIntent(), "Intent object should be present");
        assertNotNull(res.getGeneratedAt(), "GeneratedAt timestamp should be present");
        assertEquals("Wallet & Account Policy", res.getSourceDocument());
    }

    @Test
    void test21_SubIntentClassification_AccountDeactivation() {
        RagResponseDto res = ragService.queryRag("I want to deactivate my account");
        assertNotNull(res);
        assertTrue(res.getAnswer().contains("Deactivate Account"));
        assertTrue(res.getAnswer().contains("wallet balance is exactly $0.00"));
    }

    @Test
    void test22_SubIntentClassification_ChangeEmail() {
        RagResponseDto res = ragService.queryRag("How do I change my registered email address?");
        assertNotNull(res);
        assertTrue(res.getAnswer().contains("verification link will be sent"));
        assertTrue(res.getAnswer().contains("Profile -> Contact Information"));
    }

    @Test
    void test23_AdminDashboard_AiOperationsRouting() {
        // Query that contains a customer support topic word ("interest") but runs with isAdmin = true
        RagResponseDto res = ragService.queryRag("Why was today's interest distribution paused?", "admin-id", true);
        assertNotNull(res);
        assertEquals("ADMIN_OPERATIONAL_INVESTIGATOR", res.getCategory());
        assertTrue(res.getAnswer().contains("Yield Engine State"));
        assertTrue(res.getAnswer().contains("Live System & Account Data"));
    }
}
