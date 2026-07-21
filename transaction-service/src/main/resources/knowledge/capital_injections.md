# Capital Injections Procedure
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
Record operational justification in Treasury Audit Log for every capital injection.