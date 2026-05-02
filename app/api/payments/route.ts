import { NextRequest, NextResponse } from 'next/server'
import { searchPayments } from '@/lib/services/paymentService'
import type { PaymentType, PaymentStatus } from '@/types/payment'

/**
 * GET /api/payments
 * 
 * Lists and searches payments with filtering and pagination.
 * 
 * Query params:
 * - search: string - search across multiple fields
 * - paymentType: 'advance' | 'final' | 'all'
 * - status: PaymentStatus | 'all'
 * - limit: number - pagination limit (default 50)
 * - offset: number - pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const search = searchParams.get('search') || undefined
    const paymentType = (searchParams.get('paymentType') || 'all') as PaymentType | 'all'
    const status = (searchParams.get('status') || 'all') as PaymentStatus | 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await searchPayments({
      search,
      paymentType,
      status,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
