ALTER TABLE virtual_cards ADD COLUMN pin VARCHAR(4) DEFAULT '0000';

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reward_configs (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configurations for Lucky Wheel and Scratch Cards
INSERT INTO reward_configs (config_key, config_value) VALUES 
('spin_wheel', '{"prizes":[{"name":"+50 Points","weight":20,"degree":30,"points":50,"cashback":0.0},{"name":"Try Again","weight":15,"degree":90,"points":0,"cashback":0.0},{"name":"+100 Points","weight":15,"degree":150,"points":100,"cashback":0.0},{"name":"+$0.10 Cashback","weight":20,"degree":210,"points":0,"cashback":0.10},{"name":"+200 Points","weight":10,"degree":270,"points":200,"cashback":0.0},{"name":"+10 Points","weight":20,"degree":330,"points":10,"cashback":0.0}]}'),
('scratch_card', '{"prizes":[{"name":"+15 Points","weight":25,"points":15,"cashback":0.0},{"name":"+$0.25 Cashback","weight":20,"points":0,"cashback":0.25},{"name":"+20 Points","weight":25,"points":20,"cashback":0.0},{"name":"Better luck next time!","weight":10,"points":0,"cashback":0.0},{"name":"+$0.50 Cashback","weight":20,"points":0,"cashback":0.50}]}');
