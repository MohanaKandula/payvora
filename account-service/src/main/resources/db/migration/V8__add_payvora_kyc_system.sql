CREATE TABLE kyc_verifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    kyc_id VARCHAR(50) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    face_match_score DECIMAL(5,2) NOT NULL,
    ocr_confidence DECIMAL(5,2) NOT NULL,
    risk_score INT NOT NULL,
    rejection_reason VARCHAR(500),
    submitted_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP
);

CREATE TABLE kyc_documents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    document_front_url TEXT NOT NULL,
    document_back_url TEXT,
    selfie_url TEXT NOT NULL,
    encrypted BOOLEAN NOT NULL DEFAULT false,
    uploaded_at TIMESTAMP NOT NULL
);

CREATE TABLE kyc_audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_kyc_verifications_user_id ON kyc_verifications(user_id);
CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyc_audit_logs_user_id ON kyc_audit_logs(user_id);
