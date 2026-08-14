-- Add awaiting_user to ticket_status enum (awaiting reply from the reporter)
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'awaiting_user';
