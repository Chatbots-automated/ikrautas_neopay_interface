-- Development Seed Data for Payment Control Dashboard
-- 
-- WARNING: This is for DEVELOPMENT ONLY.
-- DO NOT run this on production database.
-- 
-- This creates sample payment records to test the dashboard.

-- Clear existing test data (be careful!)
-- DELETE FROM public.payment_email_logs WHERE sent_by = 'seed_script';
-- DELETE FROM public.payment_events WHERE created_by = 'seed_script';
-- DELETE FROM public.payment_request_details WHERE lead_id LIKE 'TEST_%';
-- DELETE FROM public.neopay_payments WHERE lead_id LIKE 'TEST_%';

-- ==============================================================================
-- Insert sample neopay_payments records
-- ==============================================================================

INSERT INTO public.neopay_payments (id, transaction_id, lead_id, single_project_item_id, payment_type, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'TXN_ADV_001',
    'TEST_LEAD_001',
    '9999999001',
    'advance',
    now() - interval '10 days'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'TXN_ADV_002',
    'TEST_LEAD_002',
    '9999999002',
    'advance',
    now() - interval '7 days'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'TXN_ADV_003',
    'TEST_LEAD_003',
    '9999999003',
    'advance',
    now() - interval '5 days'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'TXN_FIN_001',
    'TEST_LEAD_004',
    '9999999004',
    'final',
    now() - interval '3 days'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'TXN_FIN_002',
    'TEST_LEAD_005',
    '9999999005',
    'final',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- Insert payment_request_details
-- ==============================================================================

INSERT INTO public.payment_request_details (
  id,
  neopay_payment_id,
  lead_id,
  single_project_item_id,
  payment_type,
  client_name,
  client_email,
  client_phone,
  amount,
  currency,
  payment_url,
  email_subject,
  email_body,
  status,
  sent_at,
  paid_at,
  last_resent_at,
  monday_snapshot,
  neopay_payload,
  created_at
)
VALUES
  -- 1. Paid advance payment
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'TEST_LEAD_001',
    '9999999001',
    'advance',
    'Jonas Petraitis',
    'jonas.petraitis@example.com',
    '+37060000001',
    500.00,
    'EUR',
    'https://psd2.neopay.lt/widget.html?test_token_adv_001',
    'Avanso mokėjimas - Projektas #001',
    'Sveiki, prašome apmokėti avansą.',
    'paid',
    now() - interval '9 days',
    now() - interval '8 days',
    NULL,
    '{"item_id": "9999999001", "item_name": "Test Project 001", "synced_at": "2025-04-22T10:00:00Z"}',
    '{"type": "advance", "amount": 500, "currency": "EUR", "transactionId": "TXN_ADV_001"}',
    now() - interval '10 days'
  ),
  
  -- 2. Resent advance payment
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'TEST_LEAD_002',
    '9999999002',
    'advance',
    'Ona Kazlauskienė',
    'ona.kazlauskiene@example.com',
    '+37060000002',
    750.50,
    'EUR',
    'https://psd2.neopay.lt/widget.html?test_token_adv_002',
    'Avanso mokėjimas - Projektas #002',
    'Sveiki, prašome apmokėti avansą.',
    'resent',
    now() - interval '6 days',
    NULL,
    now() - interval '2 days',
    '{"item_id": "9999999002", "item_name": "Test Project 002", "synced_at": "2025-04-25T10:00:00Z"}',
    '{"type": "advance", "amount": 750.5, "currency": "EUR", "transactionId": "TXN_ADV_002"}',
    now() - interval '7 days'
  ),
  
  -- 3. Sent advance payment (pending)
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'TEST_LEAD_003',
    '9999999003',
    'advance',
    'Petras Jankauskas',
    'petras.jankauskas@example.com',
    '+37060000003',
    1200.00,
    'EUR',
    'https://psd2.neopay.lt/widget.html?test_token_adv_003',
    'Avanso mokėjimas - Projektas #003',
    'Sveiki, prašome apmokėti avansą.',
    'sent',
    now() - interval '4 days',
    NULL,
    NULL,
    '{"item_id": "9999999003", "item_name": "Test Project 003", "synced_at": "2025-04-27T10:00:00Z"}',
    '{"type": "advance", "amount": 1200, "currency": "EUR", "transactionId": "TXN_ADV_003"}',
    now() - interval '5 days'
  ),
  
  -- 4. Final payment sent
  (
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000004',
    'TEST_LEAD_004',
    '9999999004',
    'final',
    'Marija Vaitkienė',
    'marija.vaitkiene@example.com',
    '+37060000004',
    3500.00,
    'EUR',
    'https://psd2.neopay.lt/widget.html?test_token_fin_001',
    'Galutinis mokėjimas - Projektas #004',
    'Sveiki, prašome sumokėti likutį.',
    'sent',
    now() - interval '2 days',
    NULL,
    NULL,
    '{"item_id": "9999999004", "item_name": "Test Project 004", "synced_at": "2025-04-29T10:00:00Z"}',
    '{"type": "final", "amount": 3500, "currency": "EUR", "transactionId": "TXN_FIN_001"}',
    now() - interval '3 days'
  ),
  
  -- 5. Failed final payment
  (
    '10000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000005',
    'TEST_LEAD_005',
    '9999999005',
    'final',
    'Andrius Saulius',
    'andrius.saulius@example.com',
    '+37060000005',
    2800.75,
    'EUR',
    'https://psd2.neopay.lt/widget.html?test_token_fin_002',
    'Galutinis mokėjimas - Projektas #005',
    'Sveiki, prašome sumokėti likutį.',
    'failed',
    now() - interval '1 day',
    NULL,
    NULL,
    '{"item_id": "9999999005", "item_name": "Test Project 005", "synced_at": "2025-05-01T10:00:00Z"}',
    '{"type": "final", "amount": 2800.75, "currency": "EUR", "transactionId": "TXN_FIN_002"}',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- Insert payment_events
-- ==============================================================================

INSERT INTO public.payment_events (
  neopay_payment_id,
  payment_request_detail_id,
  lead_id,
  single_project_item_id,
  payment_type,
  event_type,
  message,
  created_by,
  created_at
)
VALUES
  -- Events for payment 1 (paid)
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'TEST_LEAD_001', '9999999001', 'advance', 'payment_found', 'Payment record created', 'seed_script', now() - interval '10 days'),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'TEST_LEAD_001', '9999999001', 'advance', 'details_synced', 'Details synced from Monday', 'seed_script', now() - interval '10 days'),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'TEST_LEAD_001', '9999999001', 'advance', 'email_sent', 'Payment link sent to client', 'seed_script', now() - interval '9 days'),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'TEST_LEAD_001', '9999999001', 'advance', 'paid', 'Payment completed successfully', 'seed_script', now() - interval '8 days'),
  
  -- Events for payment 2 (resent)
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'TEST_LEAD_002', '9999999002', 'advance', 'payment_found', 'Payment record created', 'seed_script', now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'TEST_LEAD_002', '9999999002', 'advance', 'email_sent', 'Payment link sent to client', 'seed_script', now() - interval '6 days'),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'TEST_LEAD_002', '9999999002', 'advance', 'email_resent', 'Payment link resent to client', 'seed_script', now() - interval '2 days'),
  
  -- Events for payment 3 (sent)
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'TEST_LEAD_003', '9999999003', 'advance', 'payment_found', 'Payment record created', 'seed_script', now() - interval '5 days'),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'TEST_LEAD_003', '9999999003', 'advance', 'email_sent', 'Payment link sent to client', 'seed_script', now() - interval '4 days'),
  
  -- Events for payment 4 (final sent)
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'TEST_LEAD_004', '9999999004', 'final', 'payment_found', 'Payment record created', 'seed_script', now() - interval '3 days'),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'TEST_LEAD_004', '9999999004', 'final', 'email_sent', 'Final payment link sent to client', 'seed_script', now() - interval '2 days'),
  
  -- Events for payment 5 (failed)
  ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'TEST_LEAD_005', '9999999005', 'final', 'payment_found', 'Payment record created', 'seed_script', now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'TEST_LEAD_005', '9999999005', 'final', 'email_sent', 'Final payment link sent to client', 'seed_script', now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'TEST_LEAD_005', '9999999005', 'final', 'failed', 'Payment failed - invalid card', 'seed_script', now() - interval '1 day')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- Insert payment_email_logs
-- ==============================================================================

INSERT INTO public.payment_email_logs (
  neopay_payment_id,
  payment_request_detail_id,
  recipient_email,
  subject,
  payment_url,
  payment_type,
  provider,
  status,
  sent_by,
  sent_at
)
VALUES
  -- Email logs for payment 1
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'jonas.petraitis@example.com', 'Avanso mokėjimas - Projektas #001', 'https://psd2.neopay.lt/widget.html?test_token_adv_001', 'advance', 'n8n', 'delivered', 'seed_script', now() - interval '9 days'),
  
  -- Email logs for payment 2 (sent + resent)
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'ona.kazlauskiene@example.com', 'Avanso mokėjimas - Projektas #002', 'https://psd2.neopay.lt/widget.html?test_token_adv_002', 'advance', 'n8n', 'delivered', 'seed_script', now() - interval '6 days'),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'ona.kazlauskiene@example.com', 'Avanso mokėjimas - Projektas #002 (Priminimas)', 'https://psd2.neopay.lt/widget.html?test_token_adv_002', 'advance', 'n8n', 'delivered', 'seed_script', now() - interval '2 days'),
  
  -- Email logs for payment 3
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'petras.jankauskas@example.com', 'Avanso mokėjimas - Projektas #003', 'https://psd2.neopay.lt/widget.html?test_token_adv_003', 'advance', 'n8n', 'delivered', 'seed_script', now() - interval '4 days'),
  
  -- Email logs for payment 4
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'marija.vaitkiene@example.com', 'Galutinis mokėjimas - Projektas #004', 'https://psd2.neopay.lt/widget.html?test_token_fin_001', 'final', 'n8n', 'delivered', 'seed_script', now() - interval '2 days'),
  
  -- Email logs for payment 5
  ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'andrius.saulius@example.com', 'Galutinis mokėjimas - Projektas #005', 'https://psd2.neopay.lt/widget.html?test_token_fin_002', 'final', 'n8n', 'delivered', 'seed_script', now() - interval '1 day')
ON CONFLICT DO NOTHING;
