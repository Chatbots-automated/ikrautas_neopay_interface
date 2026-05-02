import { NextRequest, NextResponse } from 'next/server'
import { syncAllPaymentsFromMonday } from '@/lib/services/mondaySyncService'

/**
 * GET /api/cron/sync-monday
 * 
 * Automated cron endpoint for syncing Monday.com payments.
 * 
 * VERCEL CRON SETUP:
 * 
 * Add to vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/sync-monday",
 *       "schedule": "0 * * * *"
 *     }
 *   ]
 * }
 * 
 * This runs every hour.
 * 
 * SECURITY:
 * In production, verify CRON_SECRET header:
 * if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authorization check in production
    // const authHeader = request.headers.get('authorization')
    // const token = authHeader?.replace('Bearer ', '')
    // if (token !== process.env.CRON_SECRET) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    console.log('[CRON] Starting Monday.com sync...')
    
    const results = await syncAllPaymentsFromMonday()

    console.log('[CRON] Sync completed:', results)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error) {
    console.error('[CRON] Error syncing from Monday:', error)
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Failed to sync from Monday',
      },
      { status: 500 }
    )
  }
}
