-- QR login sessions (web <- app confirm).
-- Table was previously created ad-hoc via `db:push` on the dev machine; this
-- migration makes it reproducible for every environment. IF NOT EXISTS keeps
-- it idempotent for databases that already have the table.
CREATE TABLE IF NOT EXISTS "qr_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE cascade,
  "device_id" text,
  "access_token" text,
  "refresh_token" text,
  "expires_at" timestamp with time zone NOT NULL,
  "confirmed_at" timestamp with time zone,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "qr_sessions_session_id_unique" ON "qr_sessions" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qr_sessions_session_idx" ON "qr_sessions" ("session_id");
