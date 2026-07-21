# Investment Lifecycle & Yield Vault
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
Review active APY rates against market benchmarks weekly.