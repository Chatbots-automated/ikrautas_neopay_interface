import type { MondayItem } from '@/types/monday'
import { MONDAY_CONFIG } from './config'

/**
 * Extracts a column value from a Monday item by column ID.
 */
export function getColumnValue(item: MondayItem, columnId: string): string | null {
  const column = item.column_values.find((col) => col.id === columnId)
  return column?.text || column?.value || null
}

/**
 * Extracts a numeric column value from a Monday item.
 * Handles both regular numeric columns and formula columns.
 */
export function getNumericColumnValue(item: MondayItem, columnId: string): number | null {
  const column = item.column_values.find((col) => col.id === columnId)
  if (!column) return null
  
  // Try text first (for formula columns and formatted numbers)
  if (column.text) {
    const parsed = parseFloat(column.text.replace(/[^0-9.-]/g, ''))
    if (!Number.isNaN(parsed)) return parsed
  }
  
  // Try value field
  if (column.value) {
    try {
      const jsonValue = JSON.parse(column.value)
      if (typeof jsonValue === 'number') return jsonValue
      if (typeof jsonValue === 'string') {
        const parsed = parseFloat(jsonValue.replace(/[^0-9.-]/g, ''))
        if (!Number.isNaN(parsed)) return parsed
      }
    } catch {
      // If not JSON, try parsing directly
      const parsed = parseFloat(column.value.replace(/[^0-9.-]/g, ''))
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  
  return null
}

/**
 * Extracts a status label from a Monday status column.
 */
export function getStatusValue(item: MondayItem, columnId: string): string | null {
  const column = item.column_values.find((col) => col.id === columnId)
  if (!column) return null
  
  // Status columns return text in the 'text' field
  if (column.text) return column.text
  
  // Try parsing JSON value if text is not available
  if (column.value) {
    try {
      const jsonValue = JSON.parse(column.value)
      if (jsonValue.label) return jsonValue.label
      if (jsonValue.text) return jsonValue.text
    } catch {
      // Not JSON
    }
  }
  
  return null
}

/**
 * Normalizes a Monday item to payment detail fields.
 * 
 * This extracts known fields from Monday columns and returns
 * a partial payment detail object suitable for database insertion.
 */
export interface NormalizedPaymentDetails {
  lead_id?: string | null
  single_project_item_id: string
  client_name?: string | null
  client_email?: string | null
  client_phone?: string | null
  advance_amount?: number | null
  final_amount?: number | null
  advance_link?: string | null
  final_link?: string | null
  monday_snapshot: Record<string, unknown>
}

export function normalizeMondayItemToPaymentDetails(
  item: MondayItem
): NormalizedPaymentDetails {
  const { COLUMNS } = MONDAY_CONFIG

  return {
    single_project_item_id: item.id,
    lead_id: getColumnValue(item, COLUMNS.LEAD_ID),
    // Client name uses the built-in item name field
    client_name: item.name || null,
    client_email: COLUMNS.CLIENT_EMAIL ? getColumnValue(item, COLUMNS.CLIENT_EMAIL) : null,
    client_phone: COLUMNS.CLIENT_PHONE ? getColumnValue(item, COLUMNS.CLIENT_PHONE) : null,
    advance_amount: getNumericColumnValue(item, COLUMNS.ADVANCE_AMOUNT),
    // Final amount is a formula column
    final_amount: COLUMNS.FINAL_AMOUNT ? getNumericColumnValue(item, COLUMNS.FINAL_AMOUNT) : null,
    advance_link: getColumnValue(item, COLUMNS.ADVANCE_LINK),
    final_link: getColumnValue(item, COLUMNS.FINAL_LINK),
    monday_snapshot: {
      item_id: item.id,
      item_name: item.name,
      column_values: item.column_values,
      advance_status: COLUMNS.ADVANCE_STATUS ? getStatusValue(item, COLUMNS.ADVANCE_STATUS) : null,
      final_status: COLUMNS.FINAL_STATUS ? getStatusValue(item, COLUMNS.FINAL_STATUS) : null,
      synced_at: new Date().toISOString(),
    },
  }
}
