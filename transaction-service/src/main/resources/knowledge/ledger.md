# Event-Sourced Accounting Ledger
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
Never alter past ledger records; issue compensating journal entries for corrections.