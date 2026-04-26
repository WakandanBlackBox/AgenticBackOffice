CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  business_name TEXT,
  hourly_rate_cents INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused','cancelled')),
  budget_cents BIGINT,
  scope_summary TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  line_items JSONB NOT NULL DEFAULT '[]',
  total_cents BIGINT NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{}',
  flags JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','signed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scope_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('request','flag','change_order','approved','rejected')),
  description TEXT NOT NULL,
  estimated_hours NUMERIC(8,2),
  estimated_cost_cents BIGINT,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent TEXT NOT NULL CHECK (agent IN ('proposal','invoice','contract','scope_guardian','insight','chief')),
  project_id UUID REFERENCES projects(id),
  input JSONB,
  output JSONB,
  model TEXT,
  input_tokens INT,
  output_tokens INT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_project ON proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_scope_events_project ON scope_events(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_user ON agent_logs(user_id, created_at DESC);

-- Milestones for project progress tracking with client approval gates
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount_cents BIGINT DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  approval_type TEXT DEFAULT 'approval_needed'
    CHECK (approval_type IN ('auto','approval_needed')),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','active','completed','approved','rejected')),
  completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Share tokens for public client portal access
CREATE TABLE IF NOT EXISTS share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  client_name TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id, position);
CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);

-- =============================================================================
-- ALTERs (idempotent) — evolve existing tables for the trust + approval layer.
-- Phase 1B of judge-feedback-integration-plan.md.
-- These run on every migrate; ADD COLUMN IF NOT EXISTS is a no-op on subsequent
-- runs. Status CHECK changes use DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT so
-- they're idempotent too.
-- =============================================================================

-- Proposals: add approval lifecycle + confidence
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
ALTER TABLE proposals ADD CONSTRAINT proposals_status_check
  CHECK (status IN ('draft','pending_approval','sent','accepted','rejected'));

-- Invoices: add approval lifecycle + paid timestamp + confidence
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft','pending_approval','sent','paid','overdue'));

-- Contracts: add approval lifecycle + confidence
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('draft','pending_approval','sent','signed'));

-- Users: onboarding tour completion timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- =============================================================================
-- Audit log — resource lifecycle (draft -> approve -> send), distinct from
-- agent_logs which records agent runs. actor_type encodes the BackOffice RBAC
-- model: owner | agent | client_portal | approver (reserved).
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('owner','agent','client_portal','approver')),
  actor_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('proposal','invoice','contract','milestone','email_draft','memory')),
  resource_id UUID,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_created ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- =============================================================================
-- Memory layer — answers "is this just GPT wrappers?" Agents remember client
-- preferences, past pricing, scope creep patterns. Two scopes: per-client and
-- workspace-wide. Pending vs confirmed: agent writes land as pending; the
-- owner promotes them via PATCH. Source attribution (agent|owner) drives the
-- review UI. Categories are an enum-by-CHECK to keep the surface focused.
-- =============================================================================
CREATE TABLE IF NOT EXISTS client_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('payment_pref','comm_tone','red_flag','pricing_history','other')),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence NUMERIC(3,2),
  source TEXT NOT NULL CHECK (source IN ('agent','owner')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, client_id, category, key)
);

CREATE TABLE IF NOT EXISTS workspace_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('payment_pref','comm_tone','red_flag','pricing_history','other')),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence NUMERIC(3,2),
  source TEXT NOT NULL CHECK (source IN ('agent','owner')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, category, key)
);

CREATE INDEX IF NOT EXISTS idx_client_memory_user_client ON client_memory(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_client_memory_user_status ON client_memory(user_id, status);
CREATE INDEX IF NOT EXISTS idx_workspace_memory_user_status ON workspace_memory(user_id, status);

-- =============================================================================
-- Automation runs — Phase 1D audit trail. Records every auto-triggered agent
-- run (e.g. milestone approved → invoice drafted, proposal accepted →
-- contract drafted) so the owner can see WHY a draft showed up unprompted.
-- Distinct from agent_logs (which records ALL runs, manual + auto) because
-- it captures the trigger context (what user/system action caused this).
-- =============================================================================
CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('milestone_approved','proposal_accepted','invoice_overdue')),
  trigger_resource_type TEXT NOT NULL CHECK (trigger_resource_type IN ('milestone','proposal','invoice')),
  trigger_resource_id UUID,
  action_agent TEXT NOT NULL,
  draft_id UUID,
  draft_resource_type TEXT,
  status TEXT NOT NULL CHECK (status IN ('success','failed','budget_blocked','skipped')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_user_created ON automation_runs(user_id, created_at DESC);

-- Indexes for the new approval-flow queries (drafts inbox, ROI)
CREATE INDEX IF NOT EXISTS idx_proposals_user_status ON proposals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_user_status ON contracts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_user_paid ON invoices(user_id, paid_at);
