-- Seed Adjusting Double-Entry Ledger Entries for System Wallets
-- Transaction 1: Fund Cashback Wallet ($500) from Owner Treasury Wallet
INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency, balance_after, idempotency_key, created_at, category) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57d702', 'e1b07221-50e5-4d76-bc34-31f41e57e801', 'e1b07221-50e5-4d76-bc34-31f41e57c601', 'DEBIT', 500.0000, 'USD', 9500.0000, 'TREASURY_FUND_CASHBACK_DEBIT', now(), 'TREASURY_ADJUSTMENT') ON CONFLICT DO NOTHING;

INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency, balance_after, idempotency_key, created_at, category) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57d710', 'e1b07221-50e5-4d76-bc34-31f41e57e801', 'e1b07221-50e5-4d76-bc34-31f41e57c605', 'CREDIT', 500.0000, 'USD', 500.0000, 'TREASURY_FUND_CASHBACK_CREDIT', now(), 'TREASURY_ADJUSTMENT') ON CONFLICT DO NOTHING;

-- Transaction 2: Fund Platform Revenue Wallet ($250) from Owner Treasury Wallet
INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency, balance_after, idempotency_key, created_at, category) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57d704', 'e1b07221-50e5-4d76-bc34-31f41e57e802', 'e1b07221-50e5-4d76-bc34-31f41e57c601', 'DEBIT', 250.0000, 'USD', 9250.0000, 'TREASURY_FUND_PLATFORM_DEBIT', now(), 'TREASURY_ADJUSTMENT') ON CONFLICT DO NOTHING;

INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency, balance_after, idempotency_key, created_at, category) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57d705', 'e1b07221-50e5-4d76-bc34-31f41e57e802', 'e1b07221-50e5-4d76-bc34-31f41e57c602', 'CREDIT', 250.0000, 'USD', 250.0000, 'TREASURY_FUND_PLATFORM_CREDIT', now(), 'TREASURY_ADJUSTMENT') ON CONFLICT DO NOTHING;

-- Transaction 3: Top up Owner Treasury Wallet by $750 from Founder Capital ($749) and Yield Reserve ($1) to set Owner Treasury = $10,000 and Yield Reserve = $4,999
INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency, balance_after, idempotency_key, created_at, category) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57d706', 'e1b07221-50e5-4d76-bc34-31f41e57e803', 'e1b07221-50e5-4d76-bc34-31f41e57c600', 'DEBIT', 749.0000, 'USD', -15749.0000, 'TREASURY_ADJUST_FOUNDER_DEBIT', now(), 'TREASURY_ADJUSTMENT') ON CONFLICT DO NOTHING;

INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency, balance_after, idempotency_key, created_at, category) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57d707', 'e1b07221-50e5-4d76-bc34-31f41e57e803', 'e1b07221-50e5-4d76-bc34-31f41e57c603', 'DEBIT', 1.0000, 'USD', 4999.0000, 'TREASURY_ADJUST_YIELD_DEBIT', now(), 'TREASURY_ADJUSTMENT') ON CONFLICT DO NOTHING;

INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency, balance_after, idempotency_key, created_at, category) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57d708', 'e1b07221-50e5-4d76-bc34-31f41e57e803', 'e1b07221-50e5-4d76-bc34-31f41e57c601', 'CREDIT', 750.0000, 'USD', 10000.0000, 'TREASURY_ADJUST_OWNER_CREDIT', now(), 'TREASURY_ADJUSTMENT') ON CONFLICT DO NOTHING;

-- Update ledger_accounts running balances to reflect these double-entry changes
UPDATE ledger_accounts SET running_balance = -15749.0000, updated_at = now() WHERE id = 'e1b07221-50e5-4d76-bc34-31f41e57c600';
UPDATE ledger_accounts SET running_balance = 10000.0000, updated_at = now() WHERE id = 'e1b07221-50e5-4d76-bc34-31f41e57c601';
UPDATE ledger_accounts SET running_balance = 250.0000, updated_at = now() WHERE id = 'e1b07221-50e5-4d76-bc34-31f41e57c602';
UPDATE ledger_accounts SET running_balance = 4999.0000, updated_at = now() WHERE id = 'e1b07221-50e5-4d76-bc34-31f41e57c603';
UPDATE ledger_accounts SET running_balance = 500.0000, updated_at = now() WHERE id = 'e1b07221-50e5-4d76-bc34-31f41e57c605';
