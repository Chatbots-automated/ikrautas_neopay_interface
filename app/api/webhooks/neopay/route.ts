import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { updatePaymentStatus } from '@/lib/services/paymentService'
import { logEvent } from '@/lib/services/eventLogger'

/**
 * POST /api/webhooks/neopay
 * 
 * Receives webhooks from NeoPay about payment status changes.
 * 
 * TODO: Add signature verification when NeoPay webhook signature method is known.
 * TODO: Confirm exact webhook payload structure from NeoPay documentation.
 * 
 * Expected payload structure (assumed):
 * {
 *   transactionId: string,
 *   status: 'success' | 'failed' | 'expired',
 *   amount?: number,
 *   currency?: string,
 *   errorMessage?: string,
 *   ...other fields
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    console.log('NeoPay webhook received:', payload)

    // TODO: Verify webhook signature
    // const signature = request.headers.get('x-neopay-signature')
    // if (!verifyNeoPaySignature(payload, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    // Extract transaction ID from payload
    // TODO: Confirm exact field name from NeoPay docs
    const transactionId = payload.transactionId || payload.transaction_id || payload.id

    if (!transactionId) {
      console.error('No transaction ID in webhook payload:', payload)
      return NextResponse.json(
        { error: 'Missing transaction ID' },
        { status: 400 }
      )
    }

    // Find matching payment
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('neopay_payments')
      .select(`
        *,
        payment_request_detail:payment_request_details(*)
      `)
      .eq('transaction_id', transactionId)
      .single()

    if (fetchError || !payment) {
      console.error('Payment not found for transaction:', transactionId)
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    const detail = Array.isArray(payment.payment_request_detail)
      ? payment.payment_request_detail[0]
      : payment.payment_request_detail

    // Log webhook received event
    await logEvent({
      neopayPaymentId: payment.id,
      paymentRequestDetailId: detail?.id,
      leadId: payment.lead_id,
      singleProjectItemId: payment.single_project_item_id,
      paymentType: payment.payment_type,
      eventType: 'neopay_webhook_received',
      message: 'NeoPay webhook received',
      metadata: payload,
    })

    // Update payment status based on webhook
    // TODO: Confirm exact status field names from NeoPay docs
    const webhookStatus = payload.status || payload.payment_status

    if (detail) {
      if (webhookStatus === 'success' || webhookStatus === 'paid' || webhookStatus === 'completed') {
        await updatePaymentStatus(detail.id, 'paid', {
          paidAt: new Date().toISOString(),
        })

        await logEvent({
          neopayPaymentId: payment.id,
          paymentRequestDetailId: detail.id,
          leadId: payment.lead_id,
          singleProjectItemId: payment.single_project_item_id,
          paymentType: payment.payment_type,
          eventType: 'paid',
          message: 'Payment completed successfully',
          metadata: payload,
        })
      } else if (webhookStatus === 'failed' || webhookStatus === 'error') {
        await updatePaymentStatus(detail.id, 'failed', {
          errorMessage: payload.errorMessage || payload.error_message || 'Payment failed',
        })

        await logEvent({
          neopayPaymentId: payment.id,
          paymentRequestDetailId: detail.id,
          leadId: payment.lead_id,
          singleProjectItemId: payment.single_project_item_id,
          paymentType: payment.payment_type,
          eventType: 'failed',
          message: 'Payment failed',
          metadata: payload,
        })
      } else if (webhookStatus === 'expired') {
        await updatePaymentStatus(detail.id, 'expired')

        await logEvent({
          neopayPaymentId: payment.id,
          paymentRequestDetailId: detail.id,
          leadId: payment.lead_id,
          singleProjectItemId: payment.single_project_item_id,
          paymentType: payment.payment_type,
          eventType: 'failed',
          message: 'Payment link expired',
          metadata: payload,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing NeoPay webhook:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
