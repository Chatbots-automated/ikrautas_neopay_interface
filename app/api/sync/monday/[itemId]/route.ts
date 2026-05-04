import { NextRequest, NextResponse } from 'next/server'
import { syncSingleItemFromMonday } from '@/lib/services/mondaySyncService'

/**
 * POST /api/sync/monday/[itemId]
 * 
 * Syncs a single Monday.com item by ID.
 * Returns the sync results for that specific item.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const itemId = params.itemId

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    const result = await syncSingleItemFromMonday(itemId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Sync failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      advanceSynced: result.advanceSynced,
      finalSynced: result.finalSynced,
      message: `Item ${itemId} synced successfully`,
    })
  } catch (error) {
    console.error('Error in single item sync:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync item' },
      { status: 500 }
    )
  }
}
