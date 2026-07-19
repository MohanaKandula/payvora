CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    sender_account_id UUID NOT NULL,
    recipient_phone_number VARCHAR(20) NOT NULL,
    message_content VARCHAR(2000) NOT NULL,
    is_payment BOOLEAN NOT NULL DEFAULT FALSE,
    payment_amount DECIMAL(15, 2),
    payment_status VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
