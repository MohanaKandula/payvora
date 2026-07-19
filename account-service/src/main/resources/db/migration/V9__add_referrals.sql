ALTER TABLE users ADD COLUMN referral_code VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN referred_by VARCHAR(50);
UPDATE users SET referral_code = 'REF-' || SUBSTRING(CAST(id AS VARCHAR), 1, 8) WHERE referral_code IS NULL;
