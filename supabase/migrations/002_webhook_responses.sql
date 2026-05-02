-- Migration: Webhook Response History
-- Stores n8n webhook responses for send history tracking

-- Create webhook_responses table
CREATE TABLE IF NOT EXISTS public.webhook_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  neopay_payment_id uuid REFERENCES public.neopay_payments(id) ON DELETE CASCADE,
  payment_request_detail_id uuid REFERENCES public.payment_request_details(id) ON DELETE SET NULL,
  
  -- Webhook request info
  webhook_url text,
  request_payload jsonb,
  
  -- Webhook response
  response_status integer NOT NULL, -- HTTP status code
  response_body jsonb,
  success boolean DEFAULT false,
  
  -- Parsed response data
  lead_id text,
  single_project_item_id text,
  amount numeric(10,2),
  payment_type text,
  
  -- Metadata
  error_message text,
  sent_by text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webhook_responses_neopay_payment_id 
  ON public.webhook_responses(neopay_payment_id);

CREATE INDEX IF NOT EXISTS idx_webhook_responses_payment_request_detail_id 
  ON public.webhook_responses(payment_request_detail_id);

CREATE INDEX IF NOT EXISTS idx_webhook_responses_lead_id 
  ON public.webhook_responses(lead_id);

CREATE INDEX IF NOT EXISTS idx_webhook_responses_single_project_item_id 
  ON public.webhook_responses(single_project_item_id);

CREATE INDEX IF NOT EXISTS idx_webhook_responses_created_at 
  ON public.webhook_responses(created_at DESC);

-- Add RLS (TODO: configure based on authentication)
ALTER TABLE public.webhook_responses ENABLE ROW LEVEL SECURITY;

-- Grant permissions (adjust based on your auth setup)
-- For now, allow service role full access
-- TODO: Add user-level policies when authentication is implemented

COMMENT ON TABLE public.webhook_responses IS 'Stores n8n webhook responses for payment send history';
COMMENT ON COLUMN public.webhook_responses.response_status IS 'HTTP status code from webhook response';
COMMENT ON COLUMN public.webhook_responses.response_body IS 'Full webhook response JSON';
COMMENT ON COLUMN public.webhook_responses.success IS 'Whether webhook indicated success';
