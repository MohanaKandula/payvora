-- 1. Add missing columns to investment_settings table
ALTER TABLE investment_settings 
ADD COLUMN IF NOT EXISTS gross_apy_rate NUMERIC(5, 2) DEFAULT 5.50,
ADD COLUMN IF NOT EXISTS platform_spread NUMERIC(5, 2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100) DEFAULT 'SYSTEM',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

UPDATE investment_settings 
SET gross_apy_rate = 5.50, platform_spread = 1.00, effective_from = NOW(), updated_by = 'SYSTEM', updated_at = NOW(), version = 0 
WHERE id = 'GLOBAL';

-- 2. Add missing columns to reward_wallets table
ALTER TABLE reward_wallets 
ADD COLUMN IF NOT EXISTS last_spin_date DATE,
ADD COLUMN IF NOT EXISTS checkin_streak INT DEFAULT 0;

-- 3. Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL,
    category VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    admin_response TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- 4. Create rag_knowledge_base table
CREATE TABLE IF NOT EXISTS rag_knowledge_base (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT NOT NULL,
    source_document VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP
);
