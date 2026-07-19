CREATE TABLE balances (
    account_id UUID PRIMARY KEY,
    current_balance NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    last_ledger_entry_id UUID NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE processed_events (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
