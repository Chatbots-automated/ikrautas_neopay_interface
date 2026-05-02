import { supabaseAdmin } from '@/lib/supabase/server'
import type {
  NeoPayPayment,
  PaymentRequestDetail,
  PaymentStatus,
  PaymentType,
  PaymentWithDetails,
  PaymentDetailView,
} from '@/types/payment'
import { logEvent } from './eventLogger'
import { logEmailSent, getPaymentEmailLogs } from './emailService'
import { getPaymentEvents } from './eventLogger'
import { getMondayItemById, getMondayItemByLeadId } from '@/lib/monday/queries'
import { normalizeMondayItemToPaymentDetails } from '@/lib/monday/normalizers'
import { decodeNeoPayUrl } from '@/lib/neopay/decodePaymentUrl'
import { generatePaymentUrl } from '@/lib/neopay/generatePaymentUrl'
import { sendToN8nWebhook } from '@/lib/webhooks/n8nClient'

/**
 * Payment Service - Core business logic for payment management.
 */

export interface CreatePaymentRequestDetailParams {
  neopayPaymentId: string
  leadId: string
  singleProjectItemId: string
  paymentType: PaymentType
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  amount?: number
  currency?: string
  paymentUrl?: string
  emailSubject?: string
  emailBody?: string
  status?: PaymentStatus
  mondaySnapshot?: Record<string, unknown>
  neopayPayload?: Record<string, unknown>
  emailPayload?: Record<string, unknown>
}

/**
 * Creates a new payment request detail record.
 */
export async function createPaymentRequestDetail(
  params: CreatePaymentRequestDetailParams
): Promise<PaymentRequestDetail> {
  const { data, error } = await supabaseAdmin
    .from('payment_request_details')
    .insert({
      neopay_payment_id: params.neopayPaymentId,
      lead_id: params.leadId,
      single_project_item_id: params.singleProjectItemId,
      payment_type: params.paymentType,
      client_name: params.clientName || null,
      client_email: params.clientEmail || null,
      client_phone: params.clientPhone || null,
      amount: params.amount || null,
      currency: params.currency || 'EUR',
      payment_url: params.paymentUrl || null,
      email_subject: params.emailSubject || null,
      email_body: params.emailBody || null,
      status: params.status || 'created',
      monday_snapshot: params.mondaySnapshot || null,
      neopay_payload: params.neopayPayload || null,
      email_payload: params.emailPayload || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create payment request detail:', error)
    throw new Error(`Failed to create payment request detail: ${error.message}`)
  }

  await logEvent({
    neopayPaymentId: params.neopayPaymentId,
    paymentRequestDetailId: data.id,
    leadId: params.leadId,
    singleProjectItemId: params.singleProjectItemId,
    paymentType: params.paymentType,
    eventType: 'details_synced',
    message: 'Payment request details created',
  })

  return data
}

/**
 * Updates payment status.
 */
export async function updatePaymentStatus(
  paymentRequestDetailId: string,
  status: PaymentStatus,
  metadata?: {
    paidAt?: string
    errorMessage?: string
  }
): Promise<void> {
  const updates: Record<string, unknown> = { status }

  if (metadata?.paidAt) {
    updates.paid_at = metadata.paidAt
  }

  if (metadata?.errorMessage) {
    updates.error_message = metadata.errorMessage
  }

  const { error } = await supabaseAdmin
    .from('payment_request_details')
    .update(updates)
    .eq('id', paymentRequestDetailId)

  if (error) {
    throw new Error(`Failed to update payment status: ${error.message}`)
  }
}

/**
 * Gets a payment by ID with details.
 */
export async function getPaymentById(neopayPaymentId: string): Promise<PaymentWithDetails | null> {
  const { data, error } = await supabaseAdmin
    .from('neopay_payments')
    .select(`
      *,
      payment_request_detail:payment_request_details(*)
    `)
    .eq('id', neopayPaymentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch payment: ${error.message}`)
  }

  return data
}

/**
 * Gets payment detail view with events and email logs.
 */
export async function getPaymentDetailView(
  neopayPaymentId: string
): Promise<PaymentDetailView | null> {
  const payment = await getPaymentById(neopayPaymentId)
  if (!payment) return null

  const events = await getPaymentEvents(neopayPaymentId)
  const emailLogs = await getPaymentEmailLogs(neopayPaymentId)
  
  // Get webhook response history
  const { getWebhookResponseHistory } = await import('./webhookResponseService')
  const webhookResponses = await getWebhookResponseHistory(neopayPaymentId)

  return {
    payment,
    details: Array.isArray(payment.payment_request_detail) 
      ? payment.payment_request_detail[0] 
      : payment.payment_request_detail,
    events,
    emailLogs,
    webhookResponses,
  }
}

export interface SearchPaymentsParams {
  search?: string
  paymentType?: PaymentType | 'all'
  status?: PaymentStatus | 'all'
  limit?: number
  offset?: number
}

/**
 * Searches and filters payments.
 */
export async function searchPayments(
  params: SearchPaymentsParams = {}
): Promise<{ payments: PaymentWithDetails[]; total: number }> {
  const { search, paymentType, status, limit = 50, offset = 0 } = params

  let query = supabaseAdmin
    .from('neopay_payments')
    .select(`
      *,
      payment_request_detail:payment_request_details(*)
    `, { count: 'exact' })

  // Filter by payment type
  if (paymentType && paymentType !== 'all') {
    query = query.eq('payment_type', paymentType)
  }

  // Search across multiple fields
  if (search && search.trim()) {
    const searchTerm = search.trim()
    
    // First, find matching payment_request_details
    const { data: matchingDetails } = await supabaseAdmin
      .from('payment_request_details')
      .select('neopay_payment_id')
      .or(
        `client_name.ilike.%${searchTerm}%,` +
        `client_email.ilike.%${searchTerm}%,` +
        `client_phone.ilike.%${searchTerm}%,` +
        `lead_id.ilike.%${searchTerm}%,` +
        `single_project_item_id.ilike.%${searchTerm}%`
      )
    
    const matchingPaymentIds = matchingDetails?.map(d => d.neopay_payment_id).filter(Boolean) || []
    
    // Search in neopay_payments fields OR matching detail IDs
    if (matchingPaymentIds.length > 0) {
      query = query.or(
        `transaction_id.ilike.%${searchTerm}%,` +
        `lead_id.ilike.%${searchTerm}%,` +
        `single_project_item_id.ilike.%${searchTerm}%,` +
        `id.in.(${matchingPaymentIds.join(',')})`
      )
    } else {
      query = query.or(
        `transaction_id.ilike.%${searchTerm}%,` +
        `lead_id.ilike.%${searchTerm}%,` +
        `single_project_item_id.ilike.%${searchTerm}%`
      )
    }
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to search payments: ${error.message}`)
  }

  // Filter by status if provided (need to check payment_request_details)
  let filteredData = data || []
  
  if (status && status !== 'all') {
    filteredData = filteredData.filter((payment) => {
      const detail = Array.isArray(payment.payment_request_detail)
        ? payment.payment_request_detail[0]
        : payment.payment_request_detail
      return detail?.status === status
    })
  }

  // Also filter by search in payment_request_details fields
  if (search && search.trim()) {
    const searchLower = search.toLowerCase()
    filteredData = filteredData.filter((payment) => {
      const detail = Array.isArray(payment.payment_request_detail)
        ? payment.payment_request_detail[0]
        : payment.payment_request_detail
      
      if (!detail) return false
      
      return (
        detail.client_name?.toLowerCase().includes(searchLower) ||
        detail.client_email?.toLowerCase().includes(searchLower) ||
        detail.client_phone?.includes(search)
      )
    })
  }

  return {
    payments: filteredData,
    total: count || 0,
  }
}

/**
 * Syncs payment details from Monday.com.
 */
export async function syncPaymentFromMonday(
  neopayPaymentId: string
): Promise<PaymentRequestDetail> {
  const payment = await getPaymentById(neopayPaymentId)
  
  if (!payment) {
    throw new Error('Payment not found')
  }

  const mondayItem = await getMondayItemById(payment.single_project_item_id)
  
  if (!mondayItem) {
    throw new Error('Monday item not found')
  }

  const normalized = normalizeMondayItemToPaymentDetails(mondayItem)

  const existingDetail = Array.isArray(payment.payment_request_detail)
    ? payment.payment_request_detail[0]
    : payment.payment_request_detail

  if (existingDetail) {
    const { data, error } = await supabaseAdmin
      .from('payment_request_details')
      .update({
        client_name: normalized.client_name,
        client_email: normalized.client_email,
        client_phone: normalized.client_phone,
        amount: payment.payment_type === 'advance' 
          ? normalized.advance_amount 
          : normalized.final_amount,
        monday_snapshot: normalized.monday_snapshot,
      })
      .eq('id', existingDetail.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update payment details: ${error.message}`)
    }

    await logEvent({
      neopayPaymentId: payment.id,
      paymentRequestDetailId: existingDetail.id,
      leadId: payment.lead_id,
      singleProjectItemId: payment.single_project_item_id,
      paymentType: payment.payment_type,
      eventType: 'monday_synced',
      message: 'Payment details synced from Monday.com',
    })

    return data
  } else {
    return await createPaymentRequestDetail({
      neopayPaymentId: payment.id,
      leadId: payment.lead_id,
      singleProjectItemId: payment.single_project_item_id,
      paymentType: payment.payment_type,
      clientName: normalized.client_name || undefined,
      clientEmail: normalized.client_email || undefined,
      clientPhone: normalized.client_phone || undefined,
      amount: payment.payment_type === 'advance' 
        ? normalized.advance_amount || undefined
        : normalized.final_amount || undefined,
      mondaySnapshot: normalized.monday_snapshot,
    })
  }
}

export interface ResendPaymentParams {
  neopayPaymentId: string
  paymentUrl?: string
  amountOverride?: number
  generateNew?: boolean
  sentBy?: string
}

/**
 * Resends a payment link (advance or final).
 * Can either reuse existing URL or generate a new one.
 */
export async function resendPayment(params: ResendPaymentParams): Promise<void> {
  const payment = await getPaymentById(params.neopayPaymentId)
  
  if (!payment) {
    throw new Error('Payment not found')
  }

  const detail = Array.isArray(payment.payment_request_detail)
    ? payment.payment_request_detail[0]
    : payment.payment_request_detail

  if (!detail) {
    throw new Error('Payment details not found. Please sync from Monday first.')
  }

  if (detail.status === 'paid') {
    throw new Error('Cannot resend a paid payment')
  }

  let paymentUrl = params.paymentUrl || detail.payment_url
  let generated = false

  // Generate new payment URL if requested or if no URL exists
  if (params.generateNew || !paymentUrl) {
    const amount = params.amountOverride || detail.amount || 0
    
    if (!amount) {
      throw new Error('Amount is required to generate payment URL')
    }

    const result = generatePaymentUrl(payment.payment_type, {
      amount,
      transactionId: payment.transaction_id,
      leadId: payment.lead_id,
      singleProjectItemId: payment.single_project_item_id,
    })

    paymentUrl = result.url
    generated = true

    // Update payment_request_details with new URL
    await supabaseAdmin
      .from('payment_request_details')
      .update({
        payment_url: paymentUrl,
        neopay_payload: result.payload,
      })
      .eq('id', detail.id)
  }

  if (!paymentUrl) {
    throw new Error('Payment URL not found. Please provide a payment URL or enable generation.')
  }

  const { extracted, payload } = decodeNeoPayUrl(paymentUrl)

  const advanceOverride = payment.payment_type === 'advance' ? params.amountOverride : undefined
  const finalOverride = payment.payment_type === 'final' ? params.amountOverride : undefined

  // Send to n8n webhook and capture response
  const webhookResponse = await sendToN8nWebhook(
    paymentUrl,
    payment.single_project_item_id,
    extracted,
    payload,
    advanceOverride,
    finalOverride
  )

  // Log webhook response for send history
  const { logWebhookResponse } = await import('./webhookResponseService')
  await logWebhookResponse({
    neopayPaymentId: payment.id,
    paymentRequestDetailId: detail.id,
    webhookUrl: process.env.N8N_WEBHOOK_URL || 'https://n8n-up8s.onrender.com/webhook/77724b7f-99f9-4512-b94f-927d958beb27',
    requestPayload: {
      event: 'resend_payment_link',
      link: paymentUrl,
      extracted,
      rawPayload: payload,
      overrides: { advanceAmount: advanceOverride, finalAmount: finalOverride },
    },
    responseStatus: 200,
    responseBody: webhookResponse,
    success: webhookResponse.success,
    sentBy: params.sentBy || 'system',
  })

  await supabaseAdmin
    .from('payment_request_details')
    .update({
      status: detail.status === 'created' ? 'sent' : 'resent',
      last_resent_at: new Date().toISOString(),
    })
    .eq('id', detail.id)

  await logEvent({
    neopayPaymentId: payment.id,
    paymentRequestDetailId: detail.id,
    leadId: payment.lead_id,
    singleProjectItemId: payment.single_project_item_id,
    paymentType: payment.payment_type,
    eventType: 'email_resent',
    message: `${payment.payment_type === 'advance' ? 'Advance' : 'Final'} payment link ${generated ? 'generated and ' : ''}resent`,
    metadata: {
      paymentUrl,
      amountOverride: params.amountOverride,
      generated,
    },
    createdBy: params.sentBy || 'system',
  })

  await logEmailSent({
    neopayPaymentId: payment.id,
    paymentRequestDetailId: detail.id,
    recipientEmail: detail.client_email || undefined,
    subject: detail.email_subject || undefined,
    paymentUrl,
    paymentType: payment.payment_type,
    provider: 'n8n',
    status: 'sent',
    sentBy: params.sentBy || 'system',
  })
}
