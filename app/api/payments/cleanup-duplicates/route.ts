import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * POST /api/payments/cleanup-duplicates
 * 
 * Removes duplicate payment records, keeping only the oldest one for each unique transaction_id + payment_type combination.
 */
export async function POST(request: NextRequest) {
  try {
    // Find all payments
    const { data: allPayments, error: fetchError } = await supabaseAdmin
      .from('neopay_payments')
      .select('id, transaction_id, payment_type, created_at')
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw new Error(`Failed to fetch payments: ${fetchError.message}`)
    }

    // Group by transaction_id + payment_type
    const grouped = new Map<string, typeof allPayments>()
    
    for (const payment of allPayments) {
      const key = `${payment.transaction_id}-${payment.payment_type}`
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(payment)
    }

    // Find duplicates (groups with more than 1 payment)
    let deletedCount = 0
    const duplicateGroups = Array.from(grouped.entries()).filter(([_, payments]) => payments.length > 1)

    for (const [key, payments] of duplicateGroups) {
      // Keep the first (oldest) one, delete the rest
      const toKeep = payments[0]
      const toDelete = payments.slice(1)

      console.log(`Found ${payments.length} duplicates for ${key}, keeping ${toKeep.id}, deleting ${toDelete.length}`)

      for (const payment of toDelete) {
        // Delete payment_request_details first (CASCADE should handle this, but just in case)
        await supabaseAdmin
          .from('payment_request_details')
          .delete()
          .eq('neopay_payment_id', payment.id)

        // Delete the payment
        const { error: deleteError } = await supabaseAdmin
          .from('neopay_payments')
          .delete()
          .eq('id', payment.id)

        if (!deleteError) {
          deletedCount++
        } else {
          console.error(`Failed to delete payment ${payment.id}:`, deleteError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} duplicate payments`,
      duplicateGroups: duplicateGroups.length,
      deletedCount,
    })
  } catch (error) {
    console.error('Error cleaning up duplicates:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cleanup duplicates' },
      { status: 500 }
    )
  }
}
