CREATE TABLE treasury_audit_logs (
    id UUID PRIMARY KEY,
    admin_user VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    reference_id UUID NOT NULL,
    wallet_id UUID NOT NULL,
    before_balance NUMERIC(19,4) NOT NULL,
    after_balance NUMERIC(19,4) NOT NULL,
    status VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45),
    device_info VARCHAR(255),
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_treasury_audit_logs_wallet ON treasury_audit_logs(wallet_id);
CREATE INDEX idx_treasury_audit_logs_created ON treasury_audit_logs(created_at DESC);
