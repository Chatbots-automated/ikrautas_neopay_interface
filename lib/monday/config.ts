import type { MondayBoardConfig } from '@/types/monday'

/**
 * Monday.com Board and Column Configuration
 * 
 * IMPORTANT: These IDs are confirmed from production.
 * DO NOT change without verifying in Monday.com.
 */

/**
 * Single Project Board Configuration
 * Board ID: 1645436514 (ITEM ID)
 * This is the main board for project management
 */
export const MONDAY_CONFIG: MondayBoardConfig = {
  BOARD_ID: 1645436514, // Single Project board (ITEM ID)
  COLUMNS: {
    // Payment URL columns
    ADVANCE_LINK: 'text_mkqxtzec',     // Advance payment URL column
    FINAL_LINK: 'text_mkr2wpca',       // Final payment URL column
    LEAD_ID: 'text_mkr4wv8q',          // Reference to Sales Pipeline B2C board
    
    // Amount columns
    ADVANCE_AMOUNT: 'numeric_mks5kp0t',  // Advance payment amount
    FINAL_AMOUNT: 'formula_mkr2vn7k',    // Final payment amount (formula)
    
    // Status columns
    ADVANCE_STATUS: 'status8',           // Advance payment status (paid = "Pervestas")
    FINAL_STATUS: 'color_mkrskyfk',      // Final payment status
    
    // Client information columns (from Single Project board)
    // Note: Client name uses the built-in item name field
    CLIENT_NAME: undefined,              // Uses item.name (built-in field)
    CLIENT_EMAIL: 'mirror95',            // Client email (mirrored)
    CLIENT_PHONE: 'mirror76',            // Client phone (mirrored)
  },
}

/**
 * Additional columns for reference
 */
export const ADDITIONAL_COLUMNS = {
  DEAL_VALUE_WO_VAT: 'text_mkr11k1z',  // Deal value without VAT
}

/**
 * Lead Board Configuration
 * Board ID: 11672945094 (LEAD ID - correct board for client contact info)
 * Used when fetching client information from lead board
 */
export const LEAD_BOARD_CONFIG = {
  BOARD_ID: 11672945094, // Lead board (LEAD ID) - source for email and phone
  COLUMNS: {
    // Client name uses the built-in item name field
    CLIENT_EMAIL: 'dup__of_email8',    // Client email
    CLIENT_PHONE: 'phone9',             // Client phone
  },
}

/**
 * Status values for payment tracking
 */
export const PAYMENT_STATUS_VALUES = {
  ADVANCE_PAID: 'Pervestas',  // Status value when advance payment is paid
  // Add other status values as needed
}

/**
 * Gets the Monday.com API token from environment.
 * Server-side only - never expose to client.
 */
export function getMondayApiToken(): string {
  const token = process.env.MONDAY_API_TOKEN
  
  if (!token) {
    throw new Error('MONDAY_API_TOKEN environment variable is not set')
  }
  
  return token
}
