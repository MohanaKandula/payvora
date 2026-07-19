CREATE TABLE ledger_accounts (
    id UUID PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    running_balance NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY,
    transaction_id UUID NOT NULL,
    account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    entry_type VARCHAR(10) NOT NULL, -- DEBIT | CREDIT
    amount NUMERIC(19,4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    balance_after NUMERIC(19,4) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate processing of the same transaction event
ALTER TABLE ledger_entries ADD CONSTRAINT uq_idempotency_entry_type UNIQUE (idempotency_key, entry_type);

-- Indices for replay, history, and lookup speed
CREATE INDEX idx_ledger_entries_account_created ON ledger_entries(account_id, created_at DESC);
CREATE INDEX idx_ledger_entries_tx_id ON ledger_entries(transaction_id);

-- PostgreSQL trigger function to block UPDATE and DELETE on ledger_entries
CREATE OR REPLACE FUNCTION prevent_modify_ledger()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Updates and Deletes are not allowed on the ledger_entries table';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_update_delete
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_modify_ledger();
