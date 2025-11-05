CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telex_user_id text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  program_name text NOT NULL,
  completion_date date NOT NULL,
  certificate_serial text UNIQUE,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
