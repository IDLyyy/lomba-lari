export type ParticipantStatus = 'REGISTERED' | 'RUNNING' | 'FINISHED' | 'DNF' | 'DISQUALIFIED';
export type ScanStatus = 'VALID' | 'REJECTED' | 'DUPLICATE';
export type UserRole = 'ADMIN' | 'CHECKPOINT_OPERATOR';

export interface Participant {
  id: string;
  participant_number: string;
  name: string;
  category: string;
  bib_number: string;
  qr_token: string;
  status: ParticipantStatus;
  created_at: string;
}

export interface Checkpoint {
  id: string;
  checkpoint_code: string;
  name: string;
  sequence: number;
  location_name: string | null;
  active: boolean;
  created_at: string;
}

export interface CheckpointScan {
  id: string;
  participant_id: string;
  checkpoint_id: string;
  scanned_at: string;
  status: ScanStatus;
  scanner_session_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  participant?: Participant;
  checkpoint?: Checkpoint;
}

export interface ScannerSession {
  id: string;
  checkpoint_id: string;
  device_name: string;
  operator_id: string | null;
  active: boolean;
  created_at: string;
  last_active_at: string;
  checkpoint?: Checkpoint;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface ScanResult {
  success: boolean;
  status: ScanStatus;
  message: string;
  participant?: Participant;
  checkpoint?: Checkpoint;
  scanned_at?: string;
}

export interface ParticipantProgress {
  participant: Participant;
  scans: CheckpointScan[];
  lastCheckpoint: Checkpoint | null;
  nextCheckpoint: Checkpoint | null;
  completedSequences: number[];
}

export interface RaceStats {
  total: number;
  running: number;
  finished: number;
  missing: number;
  disqualified: number;
  totalScans: number;
  rejectedScans: number;
}
