# Cashback Wallet & Promotional Rewards
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
Set threshold alerts when Cashback Wallet balance drops below $100.00.