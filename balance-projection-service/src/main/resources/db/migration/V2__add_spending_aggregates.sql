CREATE TABLE spending_aggregates (
    account_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    PRIMARY KEY (account_id, category)
);
