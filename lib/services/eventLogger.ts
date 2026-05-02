import { supabaseAdmin } from '@/lib/supabase/server'
import type { PaymentEvent, PaymentEventType, PaymentType } from '@/types/payment'

/**
 * Service for logging payment events to the audit trail.
 */

export interface LogEventParams {
  neopayPaymentId?: string
  paymentRequestDetailId?: string
  leadId?: string
  singleProjectItemId?: string
  paymentType?: PaymentType
  eventType: PaymentEventType
  message?: string
  metadata?: Record<string, unknown>
  createdBy?: string
}

/**
 * Logs a payment event to the audit trail.
 */
export async function logEvent(params: LogEventParams): Promise<PaymentEvent> {
  const { data, error } = await supabaseAdmin
    .from('payment_events')
    .insert({
      neopay_payment_id: params.neopayPaymentId || null,
      payment_request_detail_id: params.paymentRequestDetailId || null,
      lead_id: params.leadId || null,
      single_project_item_id: params.singleProjectItemId || null,
      payment_type: params.paymentType || null,
      event_type: params.eventType,
      message: params.message || null,
      metadata: params.metadata || null,
      created_by: params.createdBy || 'system',
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to log payment event:', error)
    throw new Error(`Failed to log event: ${error.message}`)
  }

  return data
}

/**
 * Gets all events for a specific payment.
 */
export async function getPaymentEvents(neopayPaymentId: string): Promise<PaymentEvent[]> {
  const { data, error } = await supabaseAdmin
    .from('payment_events')
    .select('*')
    .eq('neopay_payment_id', neopayPaymentId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch payment events:', error)
    throw new Error(`Failed to fetch events: ${error.message}`)
  }

  return data || []
}

/**
 * Gets all events for a payment request detail.
 */
export async function getPaymentRequestDetailEvents(
  paymentRequestDetailId: string
): Promise<PaymentEvent[]> {
  const { data, error } = await supabaseAdmin
    .from('payment_events')
    .select('*')
    .eq('payment_request_detail_id', paymentRequestDetailId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch payment request detail events:', error)
    throw new Error(`Failed to fetch events: ${error.message}`)
  }

  return data || []
}
