# System Wallet Explorer
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
Verify that total debit entries equal total credit entries across all system accounts.