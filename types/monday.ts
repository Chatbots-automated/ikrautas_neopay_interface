export interface MondayColumnValue {
  id: string
  value?: string | null
  text?: string | null
  [key: string]: unknown
}

export interface MondayItem {
  id: string
  name: string
  column_values: MondayColumnValue[]
  [key: string]: unknown
}

export interface MondayBoardConfig {
  BOARD_ID: number
  COLUMNS: {
    ADVANCE_LINK: string
    FINAL_LINK: string
    LEAD_ID: string
    ADVANCE_AMOUNT: string
    FINAL_AMOUNT?: string | undefined
    ADVANCE_STATUS?: string | undefined
    FINAL_STATUS?: string | undefined
    CLIENT_NAME?: string | undefined
    CLIENT_EMAIL?: string | undefined
    CLIENT_PHONE?: string | undefined
  }
}

export interface LeadBoardConfig {
  BOARD_ID: number
  COLUMNS: {
    CLIENT_EMAIL: string
    CLIENT_PHONE: string
  }
}
