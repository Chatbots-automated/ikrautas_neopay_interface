import { NextRequest, NextResponse } from 'next/server'
import { getPaymentDetailView } from '@/lib/services/paymentService'

/**
 * GET /api/payments/[id]
 * 
 * Gets a single payment with full details, events, and email logs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const paymentDetail = await getPaymentDetailView(id)

    if (!paymentDetail) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(paymentDetail)
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch payment' },
      { status: 500 }
    )
  }
}
