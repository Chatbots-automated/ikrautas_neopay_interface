-- Payment Control Dashboard - Database Schema Extension
-- 
-- CRITICAL: This migration does NOT touch the existing tables:
-- - public.neopay_payments (preserved)
-- - public.settings (preserved)
-- 
-- This migration ONLY adds new supporting tables for the dashboard.

-- ==============================================================================
-- 1. PAYMENT REQUEST DETAILS
-- ==============================================================================
-- Stores extended payment information for dashboard display and search.
-- Links to neopay_payments via foreign key.

CREATE TABLE IF NOT EXISTS public.payment_request_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  neopay_payment_id uuid NOT NULL REFERENCES public.neopay_payments(id) ON DELETE CASCADE,
  
  -- Mirror key fields from neopay_payments for easier querying
  lead_id text NOT NULL,
  single_project_item_id text NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('advance', 'final')),
  
  -- Client information
  client_name text,
  client_email text,
  client_phone text,
  
  -- Payment details
  amount numeric(10, 2),
  currency text DEFAULT 'EUR',
  payment_url text,
  
  -- Email details
  email_subject text,
  email_body text,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'created' CHECK (status IN (
    'created', 
    'sent', 
    'resent', 
    'paid', 
    'failed', 
    'expired', 
    'cancelled'
  )),
  
  -- Timestamps
  sent_at timestamptz,
  paid_at timestamptz,
  last_resent_at timestamptz,
  
  -- Error tracking
  error_message text,
  
  -- JSON snapshots for audit
  monday_snapshot jsonb,
  neopay_payload jsonb,
  email_payload jsonb,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for payment_request_details
CREATE INDEX IF NOT EXISTS idx_payment_request_details_neopay_payment_id 
  ON public.payment_request_details(neopay_payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_request_details_lead_id 
  ON public.payment_request_details(lead_id);

CREATE INDEX IF NOT EXISTS idx_payment_request_details_single_project_item_id 
  ON public.payment_request_details(single_project_item_id);

CREATE INDEX IF NOT EXISTS idx_payment_request_details_client_email 
  ON public.payment_request_details(client_email) WHERE client_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_request_details_client_phone 
  ON public.payment_request_details(client_phone) WHERE client_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_request_details_status 
  ON public.payment_request_details(status);

CREATE INDEX IF NOT EXISTS idx_payment_request_details_payment_type 
  ON public.payment_request_details(payment_type);

CREATE INDEX IF NOT EXISTS idx_payment_request_details_created_at 
  ON public.payment_request_details(created_at DESC);

-- Updated_at trigger for payment_request_details
CREATE OR REPLACE FUNCTION update_payment_request_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_request_details_updated_at
  BEFORE UPDATE ON public.payment_request_details
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_request_details_updated_at();

-- ==============================================================================
-- 2. PAYMENT EVENTS
-- ==============================================================================
-- Full audit timeline for all payment-related actions.

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys (nullable to support orphaned events)
  neopay_payment_id uuid REFERENCES public.neopay_payments(id) ON DELETE CASCADE,
  payment_request_detail_id uuid REFERENCES public.payment_request_details(id) ON DELETE SET NULL,
  
  -- Context fields (denormalized for easy querying)
  lead_id text,
  single_project_item_id text,
  payment_type text CHECK (payment_type IN ('advance', 'final', NULL)),
  
  -- Event details
  event_type text NOT NULL CHECK (event_type IN (
    'payment_found',
    'details_synced',
    'payment_url_decoded',
    'email_sent',
    'email_resent',
    'monday_synced',
    'neopay_webhook_received',
    'paid',
    'failed',
    'manual_action'
  )),
  
  message text,
  metadata jsonb,
  
  -- Audit
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for payment_events
CREATE INDEX IF NOT EXISTS idx_payment_events_neopay_payment_id 
  ON public.payment_events(neopay_payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment_request_detail_id 
  ON public.payment_events(payment_request_detail_id);

CREATE INDEX IF NOT EXISTS idx_payment_events_lead_id 
  ON public.payment_events(lead_id) WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_events_single_project_item_id 
  ON public.payment_events(single_project_item_id) WHERE single_project_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_events_event_type 
  ON public.payment_events(event_type);

CREATE INDEX IF NOT EXISTS idx_payment_events_created_at 
  ON public.payment_events(created_at DESC);

-- ==============================================================================
-- 3. PAYMENT EMAIL LOGS
-- ==============================================================================
-- Logs all outgoing payment email attempts.

CREATE TABLE IF NOT EXISTS public.payment_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  neopay_payment_id uuid REFERENCES public.neopay_payments(id) ON DELETE CASCADE,
  payment_request_detail_id uuid REFERENCES public.payment_request_details(id) ON DELETE SET NULL,
  
  -- Email details
  recipient_email text,
  subject text,
  body text,
  payment_url text,
  payment_type text CHECK (payment_type IN ('advance', 'final', NULL)),
  
  -- Provider details
  provider text, -- e.g., 'n8n', 'sendgrid', 'ses'
  provider_message_id text,
  
  -- Status
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced', 'delivered')),
  error_message text,
  
  -- Audit
  sent_by text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for payment_email_logs
CREATE INDEX IF NOT EXISTS idx_payment_email_logs_neopay_payment_id 
  ON public.payment_email_logs(neopay_payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_email_logs_payment_request_detail_id 
  ON public.payment_email_logs(payment_request_detail_id);

CREATE INDEX IF NOT EXISTS idx_payment_email_logs_recipient_email 
  ON public.payment_email_logs(recipient_email) WHERE recipient_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_email_logs_sent_at 
  ON public.payment_email_logs(sent_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- TODO: Enable RLS after implementing Supabase Auth
-- For now, these tables are accessible via service role key only
-- 
-- Uncomment when auth is ready:
-- 
-- ALTER TABLE public.payment_request_details ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.payment_email_logs ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Allow authenticated users to read payment_request_details"
--   ON public.payment_request_details FOR SELECT
--   TO authenticated
--   USING (true);
-- 
-- (Add more policies as needed)

-- ==============================================================================
-- COMMENTS
-- ==============================================================================

COMMENT ON TABLE public.payment_request_details IS 
  'Extended payment information for dashboard. Links to neopay_payments.';

COMMENT ON TABLE public.payment_events IS 
  'Audit log for all payment-related actions and state changes.';

COMMENT ON TABLE public.payment_email_logs IS 
  'Log of all outgoing payment email attempts.';

COMMENT ON COLUMN public.payment_request_details.neopay_payment_id IS 
  'Links to the base neopay_payments record (DO NOT TOUCH that table).';

COMMENT ON COLUMN public.payment_request_details.monday_snapshot IS 
  'JSON snapshot of Monday.com item data at time of sync.';

COMMENT ON COLUMN public.payment_request_details.neopay_payload IS 
  'Decoded NeoPay JWT payload for reference.';

COMMENT ON COLUMN public.payment_request_details.email_payload IS 
  'Copy of email data sent via provider.';
