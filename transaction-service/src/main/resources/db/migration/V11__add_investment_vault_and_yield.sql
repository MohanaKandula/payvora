CREATE TABLE investment_accounts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    invested_balance NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    total_yield_earned NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    apy_rate NUMERIC(5, 2) NOT NULL DEFAULT 4.50,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE investment_transactions (
    id UUID PRIMARY KEY,
    investment_id UUID NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- INVESTMENT_DEPOSIT, INVESTMENT_WITHDRAWAL, YIELD_CREDIT, YIELD_REVERSAL
    amount NUMERIC(19, 4) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE yield_accruals (
    id UUID PRIMARY KEY,
    investment_id UUID NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
    principal_amount NUMERIC(19, 4) NOT NULL,
    daily_rate NUMERIC(19, 8) NOT NULL,
    yield_amount NUMERIC(19, 4) NOT NULL,
    accrual_date DATE NOT NULL
);

CREATE TABLE investment_settings (
    id VARCHAR(50) PRIMARY KEY,
    apy_rate NUMERIC(5, 2) NOT NULL DEFAULT 4.50,
    yield_engine_paused BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO investment_settings (id, apy_rate, yield_engine_paused) VALUES ('GLOBAL', 4.50, FALSE);
