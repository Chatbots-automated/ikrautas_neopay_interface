import { NextRequest, NextResponse } from 'next/server'
import { decodeNeoPayUrl } from '@/lib/neopay/decodePaymentUrl'

/**
 * POST /api/neopay/decode
 * 
 * Decodes a NeoPay payment URL.
 * 
 * Body:
 * - link: string - NeoPay payment URL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { link } = body

    if (!link) {
      return NextResponse.json(
        { error: 'Missing required field: link' },
        { status: 400 }
      )
    }

    const decoded = decodeNeoPayUrl(link)

    return NextResponse.json(decoded)
  } catch (error) {
    console.error('Error decoding NeoPay URL:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to decode URL' },
      { status: 400 }
    )
  }
}
