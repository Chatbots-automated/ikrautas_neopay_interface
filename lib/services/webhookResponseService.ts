import { supabaseAdmin } from '@/lib/supabase/server'
import type { N8nWebhookResponse } from '@/lib/webhooks/n8nClient'

/**
 * Webhook Response Service
 * 
 * Logs n8n webhook responses to the database for send history tracking.
 */

export interface LogWebhookResponseParams {
  neopayPaymentId: string
  paymentRequestDetailId?: string
  webhookUrl: string
  requestPayload: unknown
  responseStatus: number
  responseBody: N8nWebhookResponse | Record<string, unknown>
  success: boolean
  errorMessage?: string
  sentBy?: string
}

/**
 * Logs a webhook response to the database.
 * This creates a record of each send attempt for history tracking.
 */
export async function logWebhookResponse(params: LogWebhookResponseParams): Promise<void> {
  // Extract payment data from response if available
  const payment = 'payment' in params.responseBody 
    ? (params.responseBody as N8nWebhookResponse).payment 
    : null

  const { error } = await supabaseAdmin.from('webhook_responses').insert({
    neopay_payment_id: params.neopayPaymentId,
    payment_request_detail_id: params.paymentRequestDetailId,
    webhook_url: params.webhookUrl,
    request_payload: params.requestPayload,
    response_status: params.responseStatus,
    response_body: params.responseBody,
    success: params.success,
    lead_id: payment?.lead_id || null,
    single_project_item_id: payment?.single_project_item_id || null,
    amount: payment?.amount || null,
    payment_type: payment?.type || null,
    error_message: params.errorMessage,
    sent_by: params.sentBy,
  })

  if (error) {
    console.error('Failed to log webhook response:', error)
    // Don't throw - logging failure shouldn't break the main flow
  }
}

/**
 * Gets webhook response history for a payment.
 */
export async function getWebhookResponseHistory(neopayPaymentId: string) {
  const { data, error } = await supabaseAdmin
    .from('webhook_responses')
    .select('*')
    .eq('neopay_payment_id', neopayPaymentId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get webhook response history: ${error.message}`)
  }

  return data
}
