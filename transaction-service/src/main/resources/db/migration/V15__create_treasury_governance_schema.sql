-- 1. Investment Orders
CREATE TABLE investment_orders (
    id UUID PRIMARY KEY,
    asset_type VARCHAR(50) NOT NULL,
    principal DECIMAL(19,4) NOT NULL,
    expected_return DECIMAL(19,4) NOT NULL,
    actual_return DECIMAL(19,4) DEFAULT 0.0000,
    status VARCHAR(20) NOT NULL, -- PENDING, ACTIVE, MATURED, FAILED, CANCELLED
    notes VARCHAR(255),
    risk_rating VARCHAR(10) DEFAULT 'LOW', -- LOW, MEDIUM, HIGH
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    invested_at TIMESTAMP,
    matured_at TIMESTAMP,
    failed_at TIMESTAMP,
    maturity_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Capital Injections
CREATE TABLE capital_injections (
    id UUID PRIMARY KEY,
    source_wallet UUID NOT NULL,
    target_wallet UUID NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    approved_by VARCHAR(100) NOT NULL,
    approved_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Treasury Profit & Loss Logs
CREATE TABLE treasury_profit_loss (
    id UUID PRIMARY KEY,
    period VARCHAR(20) NOT NULL, -- YYYY-MM
    gross_yield DECIMAL(19,4) NOT NULL,
    user_interest_paid DECIMAL(19,4) NOT NULL,
    reserve_contribution DECIMAL(19,4) NOT NULL,
    platform_revenue DECIMAL(19,4) NOT NULL,
    investment_losses DECIMAL(19,4) NOT NULL,
    net_profit DECIMAL(19,4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Active Investment Allocations (matching 70/15/10/5 allocation from initial $15M capital)
INSERT INTO investment_orders (id, asset_type, principal, expected_return, actual_return, status, risk_rating, notes, maturity_date, invested_at, created_at)
VALUES 
('d1b07221-50e5-4d76-bc34-31f41e57c701', 'TREASURY_BILLS', 10500.0000, 5.42, 0.00, 'ACTIVE', 'LOW', 'US Short Term Treasury Bill allocation', NOW() + INTERVAL '28 days', NOW(), NOW()),
('d1b07221-50e5-4d76-bc34-31f41e57c702', 'CORPORATE_BONDS', 2250.0000, 6.12, 0.00, 'ACTIVE', 'MEDIUM', 'Blue-chip Corporate Bonds rating AAA', NOW() + INTERVAL '90 days', NOW(), NOW()),
('d1b07221-50e5-4d76-bc34-31f41e57c703', 'MONEY_MARKET_FUNDS', 1500.0000, 5.05, 0.00, 'ACTIVE', 'LOW', 'Fidelity Cash Reserves MMF allocation', NOW() + INTERVAL '1 day', NOW(), NOW()),
('d1b07221-50e5-4d76-bc34-31f41e57c704', 'CASH_RESERVE', 750.0000, 0.00, 0.00, 'ACTIVE', 'LOW', 'Minimum cash reserve buffer requirement', NOW() + INTERVAL '365 days', NOW(), NOW());

-- Seed Historical Profit & Loss logs for Charts (3 Months)
INSERT INTO treasury_profit_loss (id, period, gross_yield, user_interest_paid, reserve_contribution, platform_revenue, investment_losses, net_profit, created_at)
VALUES
('f1b07221-50e5-4d76-bc34-31f41e57c801', '2026-04', 68.7500, 40.6250, 5.0000, 23.1250, 0.0000, 28.1250, NOW() - INTERVAL '90 days'),
('f1b07221-50e5-4d76-bc34-31f41e57c802', '2026-05', 71.2500, 41.2500, 6.0000, 24.0000, 0.0000, 30.0000, NOW() - INTERVAL '60 days'),
('f1b07221-50e5-4d76-bc34-31f41e57c803', '2026-06', 73.4000, 42.1000, 6.3000, 25.0000, 0.0000, 31.3000, NOW() - INTERVAL '30 days');
