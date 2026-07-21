# Yield Distribution Workflow
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
Verify midnight accrual logs daily at 00:05 UTC.