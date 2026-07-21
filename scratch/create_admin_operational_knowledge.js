const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'transaction-service', 'src', 'main', 'resources', 'knowledge');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const docs = {
  'admin_dashboard.md': `# Admin Dashboard & Central Operations
## Purpose
Provides platform administrators and operations teams with real-time oversight of system health, liquidity metrics, user activity, compliance alerts, and support escalations.

## Business Process
Admins log in to inspect live ledger totals, user KYC statuses, yield accruals, cashback reserve balances, and high-priority support tickets. Operations officers execute capital injections, APY adjustments, user freezes, or ticket resolutions.

## Dependencies
- Account Service (User authentication & role checks)
- Transaction Service (Ledger transactions & analytics)
- Ledger Service (Double-entry balance tracking)
- Support Ticket Repository

## Related Features
- Wallet Explorer
- Treasury Dashboard
- Support Ticket Escalations Desk
- Risk & Compliance Center

## Common Operational Scenarios
- **Scenario 1: High Ticket Backlog**: Multiple support tickets pending.
  - *Recommended Action*: Filter by 'PENDING' / 'URGENT' and assign agent responses.
- **Scenario 2: Liquidity Warning Indicator**: System metrics display low reserve alert.
  - *Recommended Action*: Inspect Wallet Explorer and execute Owner Treasury injection.

## Recommended Actions
Monitor daily operational metrics at 09:00 UTC and verify zero ledger discrepancies before midnight accruals.`,

  'treasury.md': `# Treasury Management Overview
## Purpose
Maintains systemic liquidity, balance sheet equilibrium, and 1:1 asset backing across all internal banking wallets.

## Business Process
Treasury tracks total liabilities (customer balances) against system assets (Owner Treasury, Yield Reserve, Cashback Reserve, Platform Revenue). Ensures capital solvency and enforces risk limits.

## Dependencies
- Owner Treasury Wallet (0xTR-001)
- Cashback Reserve Wallet (0xCB-482)
- Yield Reserve Wallet (0xYS-800)
- Platform Revenue Account (0xPR-200)

## Related Features
- Wallet Explorer
- Capital Injections Tool
- Yield Vault Engine

## Common Operational Scenarios
- **Scenario: Reserve Deficit**: Yield Reserve drops below 80% safety ratio.
  - *Recommended Action*: Trigger capital rebalance from Owner Treasury to Yield Reserve.

## Recommended Actions
Run daily treasury balance checks before scheduled interest distributions.`,

  'wallet_explorer.md': `# System Wallet Explorer
## Purpose
Enables real-time inspection of internal double-entry system wallets, credit/debit balances, and historical audit logs.

## Business Process
Provides visual transparency into the 5 core system wallets. Every transaction posts balanced debits and credits.

## Dependencies
- Ledger Service Audit Logs
- Transaction Repository

## Related Features
- Double-Entry Journal Viewer
- Treasury Health Monitor

## Common Operational Scenarios
- **Scenario: Unbalanced Debit/Credit**: Ledger variance detected.
  - *Recommended Action*: Execute Automated Ledger Reconciliation under Admin Audit.

## Recommended Actions
Verify that total debit entries equal total credit entries across all system accounts.`,

  'investments.md': `# Investment Lifecycle & Yield Vault
## Purpose
Manages user high-yield savings deposits, APY rate configurations, and daily compounding calculations.

## Business Process
User deposits funds into the Yield Vault. At midnight (00:00 UTC), interest accrues based on active global APY (e.g. 3.50%).

## Dependencies
- Investment Account Repository
- Yield Engine Accrual Cron
- Yield Reserve Wallet (0xYS-800)

## Related Features
- Yield Distribution Module
- APY Rate Controller

## Common Operational Scenarios
- **Scenario: Investment Failure / Accrual Skip**: Yield Reserve balance insufficient.
  - *Recommended Action*: Replenish Yield Reserve or pause interest distribution circuit breaker.

## Recommended Actions
Review active APY rates against market benchmarks weekly.`,

  'capital_injections.md': `# Capital Injections Procedure
## Purpose
Allows administrators to inject liquidity from Owner Treasury into Cashback or Yield Reserves during high usage.

## Business Process
Admin selects source wallet (Owner Treasury 0xTR-001) and target reserve wallet, inputs injection amount, and posts double-entry journal entry.

## Dependencies
- Owner Treasury Account
- Target Reserve Account
- Transaction Journal

## Related Features
- Treasury Health Status
- Cashback Reserve Manager

## Common Operational Scenarios
- **Scenario: Low Cashback Reserve**: Reserve falls below $100 minimum threshold.
  - *Recommended Action*: Perform $200.00 capital injection to restore warning status to HEALTHY.

## Recommended Actions
Record operational justification in Treasury Audit Log for every capital injection.`,

  'yield_distribution.md': `# Yield Distribution Workflow
## Purpose
Automates the midnight calculation and distribution of yield interest to user accounts.

## Business Process
At 00:00 UTC, the Yield Engine calculates daily interest (Balance * APY / 365), verifies Yield Reserve solvency, and credits user accounts.

## Dependencies
- Yield Engine Cron Task
- Investment Account Repository
- Yield Reserve Wallet

## Related Features
- Yield Vault
- Treasury Yield Split Config

## Common Operational Scenarios
- **Scenario: Midnight Accrual Delay**: Cron execution delayed by high transaction queue.
  - *Recommended Action*: Trigger manual yield accrual run from Admin Controls.

## Recommended Actions
Verify midnight accrual logs daily at 00:05 UTC.`,

  'yield_reserve.md': `# Yield Reserve Management
## Purpose
Holds dedicated reserve funds to guarantee customer interest payouts and protect principal capital.

## Business Process
Backed 70% by short-term US Treasury Bills and 15% AAA Corporate Bonds. Interest generated funds daily user yield payouts.

## Dependencies
- Yield Reserve Wallet (0xYS-800)
- Platform Revenue Account

## Related Features
- Investment Engine
- APY Controller

## Common Operational Scenarios
- **Scenario: Yield Reserve Warning**: Reserve drops below 80% coverage ratio.
  - *Recommended Action*: Transfer platform revenue surplus into Yield Reserve.

## Recommended Actions
Maintain a minimum 1.2x coverage ratio over projected monthly interest liabilities.`,

  'platform_revenue.md': `# Platform Revenue Tracking
## Purpose
Tracks net platform earnings from transaction processing fees, loan originations, and yield spreads.

## Business Process
A percentage of fee margins and treasury yield spreads (e.g. 15%) is credited to the Platform Revenue Account (0xPR-200).

## Dependencies
- Fee Engine
- Platform Revenue Account (0xPR-200)

## Related Features
- Treasury Overview
- Yield Split Allocation

## Common Operational Scenarios
- **Scenario: Revenue Margin Dip**: Yield split shifted towards customer APY.
  - *Recommended Action*: Adjust global APY rate or fee schedule in Settings.

## Recommended Actions
Audit platform revenue growth trends weekly.`,

  'cashback_wallet.md': `# Cashback Wallet & Promotional Rewards
## Purpose
Funds instant promotional cashback rebates (groceries, rent, recharges) awarded to users.

## Business Process
When users complete eligible transactions, the Reward Engine debits Cashback Wallet (0xCB-482) and credits user Reward Wallets.

## Dependencies
- Cashback Reserve Wallet (0xCB-482)
- Reward Engine Service

## Related Features
- Cashback Campaign Config
- Reward Claim Manager

## Common Operational Scenarios
- **Scenario: Cashback Exhaustion**: Cashback Wallet balance reaches $0.
  - *Recommended Action*: Execute capital injection from Owner Treasury.

## Recommended Actions
Set threshold alerts when Cashback Wallet balance drops below $100.00.`,

  'reconciliation.md': `# Double-Entry Ledger Reconciliation
## Purpose
Ensures 100% mathematical precision across all debits and credits in the PayVora event-sourced ledger.

## Business Process
Reconciliation engine scans all journal entries. Sum of all debits must equal sum of all credits at all times.

## Dependencies
- Ledger Service DB
- Audit Journal Repository

## Related Features
- System Wallet Explorer
- Audit Logs

## Common Operational Scenarios
- **Scenario: Reconciliation Variance**: External clearing feed timestamp mismatch.
  - *Recommended Action*: Run automated reconciliation script and inspect pending clearing suspense accounts.

## Recommended Actions
Execute automated ledger reconciliation check every 6 hours.`,

  'ledger.md': `# Event-Sourced Accounting Ledger
## Purpose
Serves as the immutable single source of truth for all monetary movements across PayVora.

## Business Process
Every payment, transfer, yield payout, or fee generates immutable, append-only debit and credit entries.

## Dependencies
- Ledger Service DB
- PostgreSQL Transaction Isolation

## Related Features
- Reconciliation Engine
- Audit Logs

## Common Operational Scenarios
- **Scenario: Transaction Dispute**: User claims incorrect balance.
  - *Recommended Action*: Query transaction ID in ledger journal to verify immutable entry.

## Recommended Actions
Never alter past ledger records; issue compensating journal entries for corrections.`,

  'audit_logs.md': `# Operational Audit Logs
## Purpose
Captures all administrator actions, system configuration changes, capital transfers, and security events.

## Business Process
When an admin performs a user freeze, updates APY, or replies to a support ticket, an audit event is permanently logged.

## Dependencies
- Audit Log Repository
- Admin Controller

## Related Features
- Admin Dashboard
- Risk Management

## Common Operational Scenarios
- **Scenario: Unauthorized Setting Change**: Unplanned APY change detected.
  - *Recommended Action*: Inspect Audit Logs by admin user ID and timestamp.

## Recommended Actions
Export monthly compliance audit logs for regulatory reporting.`,

  'compliance.md': `# Compliance & Regulatory Oversight
## Purpose
Enforces Identity Verification (KYC), Anti-Money Laundering (AML) monitoring, and sanctions screening.

## Business Process
User documents are submitted and reviewed. Users with approved KYC receive full transaction access. Suspicious accounts are flagged.

## Dependencies
- Account Service KYC Engine
- AML Monitoring Service

## Related Features
- Profile Admin View
- Account Freeze Tool

## Common Operational Scenarios
- **Scenario: Pending KYC Review**: User document flagged for manual inspection.
  - *Recommended Action*: Verify ID document clarity and approve or request resubmission under Profile Admin.

## Recommended Actions
Ensure zero unverified accounts are granted high transaction limits.`,

  'support_workflows.md': `# Customer Support Investigation & Resolution
## Purpose
Guides support agents through investigating customer inquiries, ticket escalations, and issue resolution.

## Business Process
User submits ticket -> Admin reviews subject, category, and user UUID -> Admin inspects transaction history -> Admin posts response and updates status to RESOLVED.

## Dependencies
- Support Ticket Repository
- Customer Transaction History

## Related Features
- Customer Support Desk
- Account History

## Common Operational Scenarios
- **Scenario: Failed Transfer Query**: User asks why P2P payment failed.
  - *Recommended Action*: Search user UUID in transaction log, confirm failed status, reply with resolution.

## Recommended Actions
Maintain sub-2 hour response time for URGENT priority tickets.`,

  'security.md': `# Platform Security & Access Control
## Purpose
Protects platform infrastructure through Role-Based Access Control (RBAC), Multi-Factor Authentication (MFA), and PIN authorization.

## Business Process
Admins must authenticate with ROLE_ADMIN credentials. Sensitive operational actions require valid admin JWT tokens.

## Dependencies
- JWT Security Filter
- Spring Security RBAC

## Related Features
- Admin Panel Guard
- User Security Settings

## Common Operational Scenarios
- **Scenario: Suspected Compromise**: User reports suspicious login.
  - *Recommended Action*: Trigger Emergency Account Freeze and reset MFA/PIN.

## Recommended Actions
Rotate JWT signing secrets and inspect admin access logs regularly.`,

  'risk_management.md': `# Risk Management & Fraud Detection
## Purpose
Monitors transaction velocity, high-value transfer thresholds, and abnormal withdrawal behavior.

## Business Process
Risk Engine assigns dynamic risk scores (0-100) to accounts based on velocity, location changes, and transaction size.

## Dependencies
- Risk Engine Model
- Transaction Velocity Counter

## Related Features
- Account Freeze Procedure
- Compliance Center

## Common Operational Scenarios
- **Scenario: High Risk Score Alert**: User risk score exceeds 85.
  - *Recommended Action*: Temporarily hold outgoing transfers pending verification.

## Recommended Actions
Review high-risk account alerts daily at 08:00 UTC.`,

  'architecture.md': `# PayVora System Architecture
## Purpose
Documents microservice architecture, API Gateway routing, database structure, and inter-service communications.

## Business Process
PayVora consists of 4 primary Spring Boot microservices: API Gateway (8080), Account Service (8081), Ledger Service (8082), and Transaction Service (8083).

## Dependencies
- Spring Cloud Gateway
- PostgreSQL Ledger DB
- Eureka / Microservice Routing

## Related Features
- Admin Operational Center
- RAG Vector Engine

## Common Operational Scenarios
- **Scenario: Service Timeout**: Inter-service request latency spike.
  - *Recommended Action*: Check microservice health endpoints and container logs.

## Recommended Actions
Maintain 99.99% uptime on API Gateway and Ledger Service.`,

  'glossary.md': `# Enterprise Banking Operational Glossary
## Purpose
Defines key banking, treasury, accounting, and technical terminology used across PayVora.

## Definitions
- **Double-Entry Accounting**: Accounting system where every transaction requires equal debit and credit entries.
- **Yield Reserve**: Dedicated liquidity pool used to pay customer daily APY interest.
- **Cashback Reserve**: Internal wallet funding promotional rewards and rebates.
- **KYC (Know Your Customer)**: Legal identity verification process required before enabling banking services.
- **RAG (Retrieval-Augmented Generation)**: AI technique combining vector knowledge search with real-time operational data.
- **Owner Treasury**: Primary capital wallet backing overall platform balance sheet solvency.`
};

let createdCount = 0;
for (const [filename, content] of Object.entries(docs)) {
  const filePath = path.join(targetDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  createdCount++;
  console.log('Created knowledge doc:', filename);
}

console.log('Total operational knowledge docs created:', createdCount);
