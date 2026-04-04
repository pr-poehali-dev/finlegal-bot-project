
CREATE TABLE support_tickets (
  id SERIAL PRIMARY KEY,
  user_phone VARCHAR(20),
  user_name VARCHAR(200),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_phone VARCHAR(20) NOT NULL,
  service_name VARCHAR(300) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  payment_label VARCHAR(100) UNIQUE,
  result TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
);
