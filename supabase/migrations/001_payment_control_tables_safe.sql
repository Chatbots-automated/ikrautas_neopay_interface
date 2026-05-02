-- Payment Control Dashboard - Database Schema Extension (SAFE VERSION)
-- 
-- This version safely creates tables only if they don't exist
-- and handles existing triggers gracefully.

-- ==============================================================================
-- 1. PAYMENT REQUEST DETAILS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.payment_request_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  neopay_payment_id uuid NOT NULL REFERENCES public.neopay_payments(id) ON DELETE CASCADE,
  
  lead_id text NOT NULL,
  single_project_item_id text NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('advance', 'final')),
  
  client_name text,
  client_email text,
  client_phone text,
  
  amount numeric(10, 2),
  currency text DEFAULT 'EUR',
  payment_url text,
  
  email_subject text,
  email_body text,
  
  status text NOT NULL DEFAULT 'created' CHECK (status IN (
    'created', 'sent', 'resent', 'paid', 'failed', 'expired', 'cancelled'
  )),
  
  sent_at timestamptz,
  paid_at timestamptz,
  last_resent_at timestamptz,
  
  error_message text,
  
  monday_snapshot jsonb,
  neopay_payload jsonb,
  email_payload jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
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

-- Updated_at trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_update_payment_request_details_updated_at ON public.payment_request_details;

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

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  neopay_payment_id uuid REFERENCES public.neopay_payments(id) ON DELETE CASCADE,
  payment_request_detail_id uuid REFERENCES public.payment_request_details(id) ON DELETE SET NULL,
  
  lead_id text,
  single_project_item_id text,
  payment_type text CHECK (payment_type IN ('advance', 'final', NULL)),
  
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
  
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
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

CREATE TABLE IF NOT EXISTS public.payment_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  neopay_payment_id uuid REFERENCES public.neopay_payments(id) ON DELETE CASCADE,
  payment_request_detail_id uuid REFERENCES public.payment_request_details(id) ON DELETE SET NULL,
  
  recipient_email text,
  subject text,
  body text,
  payment_url text,
  payment_type text CHECK (payment_type IN ('advance', 'final', NULL)),
  
  provider text,
  provider_message_id text,
  
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced', 'delivered')),
  error_message text,
  
  sent_by text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_email_logs_neopay_payment_id 
  ON public.payment_email_logs(neopay_payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_email_logs_payment_request_detail_id 
  ON public.payment_email_logs(payment_request_detail_id);

CREATE INDEX IF NOT EXISTS idx_payment_email_logs_recipient_email 
  ON public.payment_email_logs(recipient_email) WHERE recipient_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_email_logs_sent_at 
  ON public.payment_email_logs(sent_at DESC);

-- ==============================================================================
-- COMMENTS
-- ==============================================================================

COMMENT ON TABLE public.payment_request_details IS 
  'Extended payment information for dashboard. Links to neopay_payments.';

COMMENT ON TABLE public.payment_events IS 
  'Audit log for all payment-related actions and state changes.';

COMMENT ON TABLE public.payment_email_logs IS 
  'Log of all outgoing payment email attempts.';
