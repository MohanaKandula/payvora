INSERT INTO cashback_offers (id, title, description, transaction_type, min_amount, cashback_percentage, fixed_cashback, max_cashback, start_date, end_date, active)
VALUES ('77777777-7777-7777-7777-777777777777', 'Referral Signup Reward', 'Earn $10.00 for every friend who signs up and completes KYC.', 'REFERRAL', 0.00, 0.00, 10.00, 10.00, '2026-01-01 00:00:00', '2030-12-31 23:59:59', TRUE)
ON CONFLICT (id) DO NOTHING;
