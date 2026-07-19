CREATE TABLE cashback_offers (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER'
    min_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    cashback_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    fixed_cashback DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    max_cashback DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE cashback_transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    transaction_id UUID,
    cashback_amount DECIMAL(15, 2) NOT NULL,
    offer_id UUID REFERENCES cashback_offers(id),
    status VARCHAR(50) NOT NULL, -- 'PENDING', 'CREDITED', 'EXPIRED', 'REDEEMED'
    credited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE daily_checkins (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    checkin_date DATE NOT NULL,
    points_earned INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, checkin_date)
);

CREATE TABLE reward_wallets (
    user_id UUID PRIMARY KEY,
    cashback_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_cashback_earned DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    cashback_used DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    loyalty_points INT NOT NULL DEFAULT 0,
    loyalty_level VARCHAR(20) NOT NULL DEFAULT 'BRONZE', -- BRONZE, SILVER, GOLD, PLATINUM
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed standard neobank offers
INSERT INTO cashback_offers (id, title, description, transaction_type, min_amount, cashback_percentage, fixed_cashback, max_cashback, start_date, end_date, active)
VALUES 
('11111111-1111-1111-1111-111111111111', 'First Transaction Reward', 'Send $10.00 or more and get $2.00 Cashback instantly!', 'TRANSFER', 10.00, 0.00, 2.00, 2.00, '2026-01-01 00:00:00', '2030-12-31 23:59:59', TRUE),
('22222222-2222-2222-2222-222222222222', 'Recharge Offer', 'Mobile recharge withdrawal above $25.00 triggers $3.00 cashback.', 'WITHDRAWAL', 25.00, 0.00, 3.00, 3.00, '2026-01-01 00:00:00', '2030-12-31 23:59:59', TRUE),
('33333333-3333-3333-3333-333333333333', 'Bill Payment Offer', 'Pay electricity or utility withdrawal above $50.00 and earn 5% cashback up to $5.00.', 'WITHDRAWAL', 50.00, 5.00, 0.00, 5.00, '2026-01-01 00:00:00', '2030-12-31 23:59:59', TRUE);
