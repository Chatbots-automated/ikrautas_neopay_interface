import { supabaseAdmin } from '@/lib/supabase/server'
import { mondayGraphQL } from '@/lib/monday/client'
import { MONDAY_CONFIG } from '@/lib/monday/config'
import { normalizeMondayItemToPaymentDetails } from '@/lib/monday/normalizers'
import { logEvent } from './eventLogger'
import { decodeNeoPayUrl } from '@/lib/neopay/decodePaymentUrl'

/**
 * Monday.com Sync Service
 * 
 * Syncs all payments from Monday.com Single Project board
 * into the local database for dashboard display.
 */

interface MondayBoardItem {
  id: string
  name: string
  column_values: Array<{
    id: string
    value?: string | null
    text?: string | null
  }>
  [key: string]: unknown // Index signature for compatibility with MondayItem
}

interface GetBoardItemsResponse {
  boards: Array<{
    items_page: {
      cursor: string | null
      items: MondayBoardItem[]
    }
  }>
}

/**
 * Fetches ALL items from Monday.com Single Project board.
 * Handles pagination automatically.
 */
export async function fetchAllMondayItems(): Promise<MondayBoardItem[]> {
  const allItems: MondayBoardItem[] = []
  let cursor: string | null = null
  let hasMore = true

  while (hasMore) {
    const query = `
      query GetBoardItems($boardId: [ID!]!, $limit: Int!, $cursor: String) {
        boards(ids: $boardId) {
          items_page(limit: $limit, cursor: $cursor) {
            cursor
            items {
              id
              name
              column_values {
                id
                value
                text
              }
            }
          }
        }
      }
    `

    const response: GetBoardItemsResponse = await mondayGraphQL<GetBoardItemsResponse>(query, {
      boardId: [String(MONDAY_CONFIG.BOARD_ID)],
      limit: 100,
      cursor,
    })

    const itemsPage = response.boards[0]?.items_page || null
    if (!itemsPage || itemsPage.items.length === 0) {
      hasMore = false
      break
    }

    allItems.push(...itemsPage.items)
    cursor = itemsPage.cursor
    hasMore = !!cursor
  }

  return allItems
}

/**
 * Syncs a single Monday item to the database.
 * Creates neopay_payments and payment_request_details records.
 */
export async function syncMondayItemToDatabase(
  item: MondayBoardItem,
  syncType: 'advance' | 'final' | 'both' = 'both'
): Promise<{ advance?: string; final?: string }> {
  const normalized = normalizeMondayItemToPaymentDetails(item)
  const results: { advance?: string; final?: string } = {}

  // Sync advance payment if URL exists
  if ((syncType === 'advance' || syncType === 'both') && normalized.advance_link) {
    try {
      const decoded = decodeNeoPayUrl(normalized.advance_link)
      const transactionId = decoded.extracted.transactionId || `ADV_${item.id}`

      // Check if payment already exists
      const { data: existing } = await supabaseAdmin
        .from('neopay_payments')
        .select('id')
        .eq('transaction_id', transactionId)
        .eq('payment_type', 'advance')
        .maybeSingle()

      if (!existing) {
        // Create neopay_payments record
        const { data: payment, error: paymentError } = await supabaseAdmin
          .from('neopay_payments')
          .insert({
            transaction_id: transactionId,
            lead_id: normalized.lead_id || item.id,
            single_project_item_id: item.id,
            payment_type: 'advance',
          })
          .select()
          .single()

        if (!paymentError && payment) {
          // Create payment_request_details
          await supabaseAdmin.from('payment_request_details').insert({
            neopay_payment_id: payment.id,
            lead_id: normalized.lead_id || item.id,
            single_project_item_id: item.id,
            payment_type: 'advance',
            client_name: normalized.client_name,
            client_email: normalized.client_email,
            client_phone: normalized.client_phone,
            amount: normalized.advance_amount,
            payment_url: normalized.advance_link,
            status: 'sent',
            monday_snapshot: normalized.monday_snapshot,
            neopay_payload: decoded.payload,
          })

          await logEvent({
            neopayPaymentId: payment.id,
            leadId: normalized.lead_id || item.id,
            singleProjectItemId: item.id,
            paymentType: 'advance',
            eventType: 'payment_found',
            message: 'Advance payment synced from Monday.com',
          })

          results.advance = payment.id
        }
      }
    } catch (error) {
      console.error(`Failed to sync advance payment for item ${item.id}:`, error)
    }
  }

  // Sync final payment if URL exists
  if ((syncType === 'final' || syncType === 'both') && normalized.final_link) {
    try {
      const decoded = decodeNeoPayUrl(normalized.final_link)
      const transactionId = decoded.extracted.transactionId || `FIN_${item.id}`

      // Check if payment already exists
      const { data: existing } = await supabaseAdmin
        .from('neopay_payments')
        .select('id')
        .eq('transaction_id', transactionId)
        .eq('payment_type', 'final')
        .maybeSingle()

      if (!existing) {
        // Create neopay_payments record
        const { data: payment, error: paymentError } = await supabaseAdmin
          .from('neopay_payments')
          .insert({
            transaction_id: transactionId,
            lead_id: normalized.lead_id || item.id,
            single_project_item_id: item.id,
            payment_type: 'final',
          })
          .select()
          .single()

        if (!paymentError && payment) {
          // Create payment_request_details
          await supabaseAdmin.from('payment_request_details').insert({
            neopay_payment_id: payment.id,
            lead_id: normalized.lead_id || item.id,
            single_project_item_id: item.id,
            payment_type: 'final',
            client_name: normalized.client_name,
            client_email: normalized.client_email,
            client_phone: normalized.client_phone,
            amount: normalized.final_amount,
            payment_url: normalized.final_link,
            status: 'sent',
            monday_snapshot: normalized.monday_snapshot,
            neopay_payload: decoded.payload,
          })

          await logEvent({
            neopayPaymentId: payment.id,
            leadId: normalized.lead_id || item.id,
            singleProjectItemId: item.id,
            paymentType: 'final',
            eventType: 'payment_found',
            message: 'Final payment synced from Monday.com',
          })

          results.final = payment.id
        }
      }
    } catch (error) {
      console.error(`Failed to sync final payment for item ${item.id}:`, error)
    }
  }

  return results
}

/**
 * Syncs ALL payments from Monday.com to database.
 * This should be run initially to populate historical data.
 */
export async function syncAllPaymentsFromMonday(): Promise<{
  total: number
  advanceSynced: number
  finalSynced: number
  errors: number
}> {
  console.log('Starting full Monday.com sync...')

  const items = await fetchAllMondayItems()
  console.log(`Found ${items.length} items in Monday.com`)

  let advanceSynced = 0
  let finalSynced = 0
  let errors = 0

  for (const item of items) {
    try {
      const results = await syncMondayItemToDatabase(item, 'both')
      if (results.advance) advanceSynced++
      if (results.final) finalSynced++
    } catch (error) {
      console.error(`Error syncing item ${item.id}:`, error)
      errors++
    }
  }

  console.log('Sync complete:', {
    total: items.length,
    advanceSynced,
    finalSynced,
    errors,
  })

  return {
    total: items.length,
    advanceSynced,
    finalSynced,
    errors,
  }
}

/**
 * Syncs a single item from Monday.com by item ID.
 * Useful for refreshing a specific client's payment data.
 */
export async function syncSingleItemFromMonday(itemId: string): Promise<{
  success: boolean
  advanceSynced: boolean
  finalSynced: boolean
  error?: string
}> {
  try {
    console.log(`Syncing single item: ${itemId}`)

    const query = `
      query GetSingleItem($boardId: [ID!]!, $itemId: [ID!]!) {
        boards(ids: $boardId) {
          items_page(query_params: {ids: $itemId}) {
            items {
              id
              name
              column_values {
                id
                value
                text
              }
            }
          }
        }
      }
    `

    const response: GetBoardItemsResponse = await mondayGraphQL<GetBoardItemsResponse>(query, {
      boardId: [String(MONDAY_CONFIG.BOARD_ID)],
      itemId: [itemId],
    })

    const item = response.boards[0]?.items_page?.items[0]
    if (!item) {
      return {
        success: false,
        advanceSynced: false,
        finalSynced: false,
        error: 'Item not found in Monday.com',
      }
    }

    const results = await syncMondayItemToDatabase(item, 'both')

    return {
      success: true,
      advanceSynced: !!results.advance,
      finalSynced: !!results.final,
    }
  } catch (error) {
    console.error(`Error syncing single item ${itemId}:`, error)
    return {
      success: false,
      advanceSynced: false,
      finalSynced: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
