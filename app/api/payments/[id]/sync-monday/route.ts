import { NextRequest, NextResponse } from 'next/server'
import { syncPaymentFromMonday } from '@/lib/services/paymentService'

/**
 * POST /api/payments/[id]/sync-monday
 * 
 * Syncs payment details from Monday.com.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updatedDetail = await syncPaymentFromMonday(id)

    return NextResponse.json({ success: true, detail: updatedDetail })
  } catch (error) {
    console.error('Error syncing from Monday:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync from Monday' },
      { status: 500 }
    )
  }
}
