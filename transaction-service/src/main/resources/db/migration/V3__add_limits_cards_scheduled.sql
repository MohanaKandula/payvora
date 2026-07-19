CREATE TABLE account_limits (
    account_id UUID PRIMARY KEY,
    daily_limit DECIMAL(19, 4),
    weekly_limit DECIMAL(19, 4),
    single_limit DECIMAL(19, 4)
);

CREATE TABLE virtual_cards (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL,
    card_number VARCHAR(16) NOT NULL,
    cardholder_name VARCHAR(100) NOT NULL,
    cvv VARCHAR(3) NOT NULL,
    expiry_date VARCHAR(5) NOT NULL,
    status VARCHAR(20) NOT NULL,
    card_limit DECIMAL(19, 4),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scheduled_payments (
    id UUID PRIMARY KEY,
    source_account_id UUID NOT NULL,
    target_account_id UUID,
    amount DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    category VARCHAR(50) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    payment_type VARCHAR(20) NOT NULL,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL
);
