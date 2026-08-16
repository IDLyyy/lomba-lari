-- QR Checkpoint Running System — Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM types
CREATE TYPE user_role AS ENUM ('ADMIN', 'CHECKPOINT_OPERATOR');
CREATE TYPE scan_status AS ENUM ('VALID', 'REJECTED', 'DUPLICATE');
CREATE TYPE participant_status AS ENUM ('REGISTERED', 'RUNNING', 'FINISHED', 'DNF', 'DISQUALIFIED');

-- Users table (extends Supabase auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'CHECKPOINT_OPERATOR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Participants
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '10K',
  bib_number TEXT NOT NULL UNIQUE,
  qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  status participant_status NOT NULL DEFAULT 'REGISTERED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Checkpoints
CREATE TABLE IF NOT EXISTS checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sequence INT NOT NULL UNIQUE,
  location_name TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scanner sessions
CREATE TABLE IF NOT EXISTS scanner_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  operator_id UUID REFERENCES profiles(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Checkpoint scans
CREATE TABLE IF NOT EXISTS checkpoint_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status scan_status NOT NULL,
  scanner_session_id UUID REFERENCES scanner_sessions(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scans_participant ON checkpoint_scans(participant_id);
CREATE INDEX idx_scans_checkpoint ON checkpoint_scans(checkpoint_id);
CREATE INDEX idx_scans_status ON checkpoint_scans(status);
CREATE INDEX idx_participants_qr ON participants(qr_token);
CREATE INDEX idx_participants_bib ON participants(bib_number);
CREATE INDEX idx_checkpoints_seq ON checkpoints(sequence);

-- RLS policies
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Authenticated read all" ON participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON checkpoints FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON checkpoint_scans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read all" ON scanner_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Admin full access
CREATE POLICY "Admin full access" ON participants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin full access" ON checkpoints FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin full access" ON checkpoint_scans FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin full access" ON scanner_sessions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Operators can insert scans
CREATE POLICY "Operator insert scans" ON checkpoint_scans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'CHECKPOINT_OPERATOR')));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE checkpoint_scans;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;

-- Seed checkpoints
INSERT INTO checkpoints (checkpoint_code, name, sequence, location_name) VALUES
  ('CP01', 'Checkpoint 01', 1, 'KM 2.5'),
  ('CP02', 'Checkpoint 02', 2, 'KM 5.0'),
  ('CP03', 'Checkpoint 03', 3, 'KM 7.5'),
  ('FINISH', 'Finish', 4, 'Finish Line')
ON CONFLICT (checkpoint_code) DO NOTHING;
