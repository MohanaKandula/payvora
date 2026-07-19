-- Repair double-entry imbalance for transaction e1b07221-50e5-4d76-bc34-31f41e57e801
-- Check if the credit entry of $500 already exists; if not, insert it.
INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency, balance_after, idempotency_key, created_at, category)
VALUES (
  'e1b07221-50e5-4d76-bc34-31f41e57d710', 
  'e1b07221-50e5-4d76-bc34-31f41e57e801', 
  'e1b07221-50e5-4d76-bc34-31f41e57c605', 
  'CREDIT', 
  500.0000, 
  'USD', 
  500.0000, 
  'TREASURY_FUND_CASHBACK_CREDIT', 
  NOW(), 
  'TREASURY_ADJUSTMENT'
) ON CONFLICT (id) DO NOTHING;
