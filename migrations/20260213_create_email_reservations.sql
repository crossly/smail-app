CREATE TABLE IF NOT EXISTS email_reservations (
    address TEXT PRIMARY KEY,
    owner_token TEXT NOT NULL,
    issued_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_reservations_expires_at
ON email_reservations (expires_at);
