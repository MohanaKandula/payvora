# Spending Analytics Dashboard
## Overview
The Spending Analytics page (`/analytics`) compiles real-time debit card usage, peer-to-peer transfers, and utility payments from the double-entry core ledger to provide members with clear visual insights into their financial health.

## Core Analytics Indicators
1. **Total Outgoing Expenses**: Cumulative total of all transactional debit posts, peer-to-peer transfers, and cashout events over the billing period.
2. **Current Account Balance**: Real-time liquid funds residing in the member's Spendable Wallet that are available for immediate use.
3. **Active Virtual Cards**: Count of active digital card profiles (both single-use burner cards and multi-use subscription cards).

## Expense Category Breakdowns
The dashboard groups outbounds into six standard merchant category classifications:
- **Groceries**: Purchases made at grocers and food markets (standard Weekend Grocery Boost eligible).
- **Entertainment**: Spending at entertainment venues, ticketing merchants, and gambling partners.
- **Utilities & Bills**: Recurring utility withdrawals, prepaid mobile recharges, and broadband payments.
- **Rent & Housing**: Regular monthly rent transfers (inactive cashback today).
- **Investments**: Balance movements deposited into the high-yield Savings Vault.
- **Others**: Standard retail or miscellaneous ledger withdrawals.

## Interactive Visualizations
- **Expense Distribution Donut Chart**: Interactively highlights selected categories to show percentage contributions to total spending.
- **Weekly Fluctuation Spline Graph**: Maps daily transaction peaks over the past 7 days to isolate spending spikes.
- **Monthly Budget Tracker & Planner**: A simulation slider that allows members to adjust budget goals, showing left-to-spend forecasts and warning indicators if projected daily trends exceed the set limit.
