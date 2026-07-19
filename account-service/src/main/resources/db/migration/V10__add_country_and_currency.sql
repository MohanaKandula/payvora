ALTER TABLE accounts ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

INSERT INTO accounts (id, email, full_name, kyc_status, status, country, currency, created_at, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c600', 'founder@payvora.com', 'Founder Capital Account', 'APPROVED', 'ACTIVE', 'United States', 'USD', now(), now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, email, full_name, kyc_status, status, country, currency, created_at, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c601', 'treasury@payvora.com', 'Owner Treasury Wallet', 'APPROVED', 'ACTIVE', 'United States', 'USD', now(), now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, email, full_name, kyc_status, status, country, currency, created_at, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c602', 'revenue@payvora.com', 'Platform Revenue Wallet', 'APPROVED', 'ACTIVE', 'United States', 'USD', now(), now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, email, full_name, kyc_status, status, country, currency, created_at, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c603', 'yield-reserve@payvora.com', 'Yield Reserve Wallet', 'APPROVED', 'ACTIVE', 'United States', 'USD', now(), now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, email, full_name, kyc_status, status, country, currency, created_at, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c604', 'settlement@payvora.com', 'Settlement Wallet', 'APPROVED', 'ACTIVE', 'United States', 'USD', now(), now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, email, full_name, kyc_status, status, country, currency, created_at, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c605', 'cashback@payvora.com', 'Cashback Wallet', 'APPROVED', 'ACTIVE', 'United States', 'USD', now(), now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, email, full_name, kyc_status, status, country, currency, created_at, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c606', 'operations@payvora.com', 'Operations Wallet', 'APPROVED', 'ACTIVE', 'United States', 'USD', now(), now()) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, email, full_name, kyc_status, status, country, currency, created_at, updated_at) VALUES
('e1b07221-50e5-4d76-bc34-31f41e57c607', 'portfolio@payvora.com', 'Treasury Investment Portfolio', 'APPROVED', 'ACTIVE', 'United States', 'USD', now(), now()) ON CONFLICT (id) DO NOTHING;
