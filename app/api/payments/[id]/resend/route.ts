import { NextRequest, NextResponse } from 'next/server'
import { resendPayment } from '@/lib/services/paymentService'

/**
 * POST /api/payments/[id]/resend
 * 
 * Resends a payment link (advance or final).
 * 
 * Body:
 * - paymentUrl?: string - optional override payment URL
 * - amountOverride?: number - optional amount override
 * - sentBy?: string - who is resending (for audit)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    await resendPayment({
      neopayPaymentId: id,
      paymentUrl: body.paymentUrl,
      amountOverride: body.amountOverride,
      sentBy: body.sentBy || 'dashboard_user',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resending payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resend payment' },
      { status: 500 }
    )
  }
}
