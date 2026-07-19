-- Seed System Wallets in ledger_accounts
INSERT INTO ledger_accounts (id, status, running_balance, currency, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c600', 'ACTIVE', -15000.0000, 'USD', now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO ledger_accounts (id, status, running_balance, currency, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c601', 'ACTIVE', 10000.0000, 'USD', now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO ledger_accounts (id, status, running_balance, currency, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c602', 'ACTIVE', 0.0000, 'USD', now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO ledger_accounts (id, status, running_balance, currency, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c603', 'ACTIVE', 5000.0000, 'USD', now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO ledger_accounts (id, status, running_balance, currency, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c604', 'ACTIVE', 0.0000, 'USD', now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO ledger_accounts (id, status, running_balance, currency, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c605', 'ACTIVE', 0.0000, 'USD', now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO ledger_accounts (id, status, running_balance, currency, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c606', 'ACTIVE', 0.0000, 'USD', now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO ledger_accounts (id, status, running_balance, currency, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c607', 'ACTIVE', 0.0000, 'USD', now()) ON CONFLICT (id) DO NOTHING;

-- Seed Double-Entry Capitalization Ledger Entries
-- Entry 1: Founder Capital Debit
INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency, balance_after, idempotency_key, created_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57d700', 'e1b07221-50e5-4d76-bc34-31f41e57e800', 'e1b07221-50e5-4d76-bc34-31f41e57c600', 'DEBIT', 15000.0000, 'USD', -15000.0000, 'CAPITAL_INJECTION', now()) ON CONFLICT (idempotency_key, entry_type) DO NOTHING;

-- Entry 2: Owner Treasury Credit
INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency, balance_after, idempotency_key, created_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57d701', 'e1b07221-50e5-4d76-bc34-31f41e57e800', 'e1b07221-50e5-4d76-bc34-31f41e57c601', 'CREDIT', 10000.0000, 'USD', 10000.0000, 'CAPITAL_INJECTION', now()) ON CONFLICT (idempotency_key, entry_type) DO NOTHING;

-- Entry 3: Yield Reserve Credit
INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency, balance_after, idempotency_key, created_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57d703', 'e1b07221-50e5-4d76-bc34-31f41e57e800', 'e1b07221-50e5-4d76-bc34-31f41e57c603', 'CREDIT', 5000.0000, 'USD', 5000.0000, 'CAPITAL_INJECTION_RESERVE', now()) ON CONFLICT (idempotency_key, entry_type) DO NOTHING;
