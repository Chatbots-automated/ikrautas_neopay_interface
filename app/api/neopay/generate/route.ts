import { NextRequest, NextResponse } from 'next/server'
import { generatePaymentUrl } from '@/lib/neopay/generatePaymentUrl'

/**
 * POST /api/neopay/generate
 * 
 * Generates a new NeoPay payment URL (advance or final).
 * 
 * Body:
 * - type: 'advance' | 'final'
 * - amount: number
 * - transactionId: string (for advance)
 * - leadId: string (for final)
 * - singleProjectItemId: string
 * - clientRedirectUrl?: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, amount, transactionId, leadId, singleProjectItemId, clientRedirectUrl } = body

    if (!type || !amount || !singleProjectItemId) {
      return NextResponse.json(
        { error: 'Missing required fields: type, amount, singleProjectItemId' },
        { status: 400 }
      )
    }

    if (type !== 'advance' && type !== 'final') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "advance" or "final"' },
        { status: 400 }
      )
    }

    const result = generatePaymentUrl(type, {
      amount,
      transactionId,
      leadId,
      singleProjectItemId,
      clientRedirectUrl,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating payment URL:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate payment URL' },
      { status: 500 }
    )
  }
}
