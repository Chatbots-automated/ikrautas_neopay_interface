import { mondayGraphQL } from './client'
import { MONDAY_CONFIG, LEAD_BOARD_CONFIG } from './config'
import type { MondayItem } from '@/types/monday'

/**
 * Monday.com query helpers.
 * Uses the existing Monday GraphQL client.
 */

interface ChangeColumnsResponse {
  change_multiple_column_values: {
    id: string
  }
}

interface GetItemResponse {
  items: MondayItem[]
}

interface SearchBoardResponse {
  boards: Array<{
    items_page: {
      items: MondayItem[]
    }
  }>
}

/**
 * Updates multiple columns on a Monday.com item.
 * 
 * Ported from api/index.js lines 258-269
 * 
 * @param itemId - Monday item ID (string)
 * @param columnValues - Object mapping column IDs to values
 */
export async function updateMondayColumns(
  itemId: string,
  columnValues: Record<string, unknown>
): Promise<void> {
  const mutation = `
    mutation Update($boardId: ID!, $itemId: ID!, $cols: JSON!) {
      change_multiple_column_values(
        board_id: $boardId, 
        item_id: $itemId, 
        column_values: $cols
      ) { 
        id 
      }
    }
  `

  await mondayGraphQL<ChangeColumnsResponse>(mutation, {
    boardId: String(MONDAY_CONFIG.BOARD_ID),
    itemId: String(itemId),
    cols: JSON.stringify(columnValues),
  })
}

/**
 * Updates only the advance amount on a Monday item.
 * 
 * Ported from api/index.js lines 271-277
 * 
 * @param itemId - Monday item ID
 * @param amount - Advance amount in EUR
 */
export async function updateAdvanceAmount(itemId: string, amount: number): Promise<void> {
  const rounded = Math.round(Number(amount) * 100) / 100

  if (Number.isNaN(rounded)) {
    throw new Error('Invalid amount.')
  }

  await updateMondayColumns(itemId, {
    [MONDAY_CONFIG.COLUMNS.ADVANCE_AMOUNT]: rounded,
  })
}

/**
 * Gets a Monday.com item by its ID.
 * 
 * @param itemId - Monday item ID
 * @returns Monday item or null if not found
 */
export async function getMondayItemById(itemId: string): Promise<MondayItem | null> {
  const query = `
    query GetItem($itemId: [ID!]!) {
      items(ids: $itemId) {
        id
        name
        column_values {
          id
          value
          text
        }
      }
    }
  `

  const response = await mondayGraphQL<GetItemResponse>(query, {
    itemId: [String(itemId)],
  })

  return response.items[0] || null
}

/**
 * Searches for Monday items by column value.
 * Useful for finding items by lead ID or other custom fields.
 * 
 * @param columnId - Column ID to search in
 * @param searchValue - Value to search for
 * @returns Array of matching items
 */
export async function searchMondayItemsByColumn(
  columnId: string,
  searchValue: string
): Promise<MondayItem[]> {
  const query = `
    query SearchBoard($boardId: [ID!]!, $columnId: String!, $columnValue: String!) {
      boards(ids: $boardId) {
        items_page(
          query_params: {
            rules: [{ column_id: $columnId, compare_value: [$columnValue] }]
          }
        ) {
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

  const response = await mondayGraphQL<SearchBoardResponse>(query, {
    boardId: [String(MONDAY_CONFIG.BOARD_ID)],
    columnId,
    columnValue: searchValue,
  })

  return response.boards[0]?.items_page?.items || []
}

/**
 * Gets a Monday item by lead ID from Single Project board.
 * 
 * @param leadId - Lead ID value
 * @returns Monday item or null if not found
 */
export async function getMondayItemByLeadId(leadId: string): Promise<MondayItem | null> {
  const items = await searchMondayItemsByColumn(MONDAY_CONFIG.COLUMNS.LEAD_ID, leadId)
  return items[0] || null
}

/**
 * Gets a Monday item from the Lead board (Sales Pipeline B2C).
 * 
 * @param leadItemId - Lead item ID
 * @returns Monday item from lead board or null if not found
 */
export async function getLeadBoardItem(leadItemId: string): Promise<MondayItem | null> {
  const query = `
    query GetLeadItem($itemId: [ID!]!, $boardId: [ID!]!) {
      boards(ids: $boardId) {
        items_page(limit: 1, query_params: { ids: $itemId }) {
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

  const response = await mondayGraphQL<SearchBoardResponse>(query, {
    itemId: [String(leadItemId)],
    boardId: [String(LEAD_BOARD_CONFIG.BOARD_ID)],
  })

  return response.boards[0]?.items_page?.items[0] || null
}
