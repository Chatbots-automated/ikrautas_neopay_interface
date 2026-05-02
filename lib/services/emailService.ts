import { supabaseAdmin } from '@/lib/supabase/server'
import type { PaymentEmailLog, PaymentType } from '@/types/payment'

/**
 * Service for logging payment email sends.
 */

export interface LogEmailParams {
  neopayPaymentId?: string
  paymentRequestDetailId?: string
  recipientEmail?: string
  subject?: string
  body?: string
  paymentUrl?: string
  paymentType?: PaymentType
  provider?: string
  providerMessageId?: string
  status?: 'sent' | 'failed' | 'bounced' | 'delivered'
  errorMessage?: string
  sentBy?: string
}

/**
 * Logs an email send attempt to the database.
 */
export async function logEmailSent(params: LogEmailParams): Promise<PaymentEmailLog> {
  const { data, error } = await supabaseAdmin
    .from('payment_email_logs')
    .insert({
      neopay_payment_id: params.neopayPaymentId || null,
      payment_request_detail_id: params.paymentRequestDetailId || null,
      recipient_email: params.recipientEmail || null,
      subject: params.subject || null,
      body: params.body || null,
      payment_url: params.paymentUrl || null,
      payment_type: params.paymentType || null,
      provider: params.provider || 'n8n',
      provider_message_id: params.providerMessageId || null,
      status: params.status || 'sent',
      error_message: params.errorMessage || null,
      sent_by: params.sentBy || 'system',
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to log email:', error)
    throw new Error(`Failed to log email: ${error.message}`)
  }

  return data
}

/**
 * Gets all email logs for a specific payment.
 */
export async function getPaymentEmailLogs(neopayPaymentId: string): Promise<PaymentEmailLog[]> {
  const { data, error } = await supabaseAdmin
    .from('payment_email_logs')
    .select('*')
    .eq('neopay_payment_id', neopayPaymentId)
    .order('sent_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch email logs:', error)
    throw new Error(`Failed to fetch email logs: ${error.message}`)
  }

  return data || []
}

/**
 * Gets all email logs for a payment request detail.
 */
export async function getPaymentRequestDetailEmailLogs(
  paymentRequestDetailId: string
): Promise<PaymentEmailLog[]> {
  const { data, error } = await supabaseAdmin
    .from('payment_email_logs')
    .select('*')
    .eq('payment_request_detail_id', paymentRequestDetailId)
    .order('sent_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch email logs:', error)
    throw new Error(`Failed to fetch email logs: ${error.message}`)
  }

  return data || []
}
