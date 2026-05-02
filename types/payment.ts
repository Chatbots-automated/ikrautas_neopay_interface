export type PaymentType = 'advance' | 'final'

export type PaymentStatus = 
  | 'created' 
  | 'sent' 
  | 'resent' 
  | 'paid' 
  | 'failed' 
  | 'expired' 
  | 'cancelled'

export interface NeoPayPayment {
  id: string
  transaction_id: string
  lead_id: string
  single_project_item_id: string
  payment_type: PaymentType
  created_at: string
}

export interface PaymentRequestDetail {
  id: string
  neopay_payment_id: string
  lead_id: string
  single_project_item_id: string
  payment_type: PaymentType
  client_name?: string | null
  client_email?: string | null
  client_phone?: string | null
  amount?: number | null
  currency?: string | null
  payment_url?: string | null
  email_subject?: string | null
  email_body?: string | null
  status: PaymentStatus
  sent_at?: string | null
  paid_at?: string | null
  last_resent_at?: string | null
  error_message?: string | null
  monday_snapshot?: Record<string, unknown> | null
  neopay_payload?: Record<string, unknown> | null
  email_payload?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type PaymentEventType = 
  | 'payment_found'
  | 'details_synced'
  | 'payment_url_decoded'
  | 'email_sent'
  | 'email_resent'
  | 'monday_synced'
  | 'neopay_webhook_received'
  | 'paid'
  | 'failed'
  | 'manual_action'

export interface PaymentEvent {
  id: string
  neopay_payment_id?: string | null
  payment_request_detail_id?: string | null
  lead_id?: string | null
  single_project_item_id?: string | null
  payment_type?: PaymentType | null
  event_type: PaymentEventType
  message?: string | null
  metadata?: Record<string, unknown> | null
  created_by?: string | null
  created_at: string
}

export interface PaymentEmailLog {
  id: string
  neopay_payment_id?: string | null
  payment_request_detail_id?: string | null
  recipient_email?: string | null
  subject?: string | null
  body?: string | null
  payment_url?: string | null
  payment_type?: PaymentType | null
  provider?: string | null
  provider_message_id?: string | null
  status?: string | null
  error_message?: string | null
  sent_by?: string | null
  sent_at: string
}

export interface PaymentWithDetails extends NeoPayPayment {
  payment_request_detail?: PaymentRequestDetail | null
}

export interface PaymentDetailView {
  payment: NeoPayPayment
  details?: PaymentRequestDetail | null
  events: PaymentEvent[]
  emailLogs: PaymentEmailLog[]
}
