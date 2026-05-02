import { NextRequest, NextResponse } from 'next/server'
import { syncAllPaymentsFromMonday } from '@/lib/services/mondaySyncService'

/**
 * POST /api/sync/monday
 * 
 * Syncs all payments from Monday.com Single Project board.
 * This will fetch ALL items and create payment records for any
 * that have payment URLs but don't exist in the database yet.
 * 
 * Use this to:
 * - Initial historical data import
 * - Manual refresh to catch new payments
 * - Scheduled sync (e.g., via cron job)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Starting Monday.com sync...')
    
    const results = await syncAllPaymentsFromMonday()

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      results,
    })
  } catch (error) {
    console.error('Error syncing from Monday:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync from Monday',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sync/monday
 * 
 * Returns sync status/info (for health checks or status page)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/sync/monday',
    method: 'POST',
    description: 'Syncs all payments from Monday.com to database',
    usage: 'POST to this endpoint to trigger a full sync',
  })
}
