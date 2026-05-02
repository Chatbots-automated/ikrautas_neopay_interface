# Monday.com Configuration Reference

Complete mapping of all Monday.com boards and columns used in the Payment Control Dashboard.

## Boards

### 1. Single Project Board (ITEM ID)
**Board ID**: `1645436514`

This is the main project management board where payment URLs, amounts, and status are tracked.

### 2. Lead Board (LEAD ID)
**Board ID**: `11672945094`

This is the lead/client management board with client contact information.

---

## Single Project Board - Column Mapping

### Payment URL Columns
| Purpose | Column ID | Type | Description |
|---------|-----------|------|-------------|
| Advance Payment URL | `text_mkqxtzec` | Text | NeoPay advance payment link |
| Final Payment URL | `text_mkr2wpca` | Text | NeoPay final payment link |

### Amount Columns
| Purpose | Column ID | Type | Description |
|---------|-----------|------|-------------|
| Advance Amount | `numeric_mks5kp0t` | Numeric | Advance payment amount in EUR |
| Final Amount | `formula_mkr2vn7k` | Formula | Final payment amount (calculated) |
| Deal Value (no VAT) | `text_mkr11k1z` | Text | Total deal value without VAT |

### Status Columns
| Purpose | Column ID | Type | Values | Description |
|---------|-----------|------|--------|-------------|
| Advance Status | `status8` | Status | "Pervestas" = paid | Tracks advance payment status |
| Final Status | `color_mkrskyfk` | Status | Various | Tracks final payment status |

### Client Information Columns
| Purpose | Column ID | Type | Description |
|---------|-----------|------|-------------|
| Client Name | `item.name` | Built-in | Item name field (not a custom column) |
| Client Email | `mirror95` | Mirror | Mirrored from lead board |
| Client Phone | `mirror76` | Mirror | Mirrored from lead board |

### Reference Columns
| Purpose | Column ID | Type | Description |
|---------|-----------|------|-------------|
| Lead ID | `text_mkr4wv8q` | Text | Reference to Sales Pipeline B2C board item |

---

## Lead Board - Column Mapping

### Client Information Columns
| Purpose | Column ID | Type | Description |
|---------|-----------|------|-------------|
| Client Name | `item.name` | Built-in | Item name field (not a custom column) |
| Client Email | `dup__of_email8` | Email | Client's email address |
| Client Phone | `phone9` | Phone | Client's phone number |

---

## Usage in Code

### Configuration Location
All column IDs are defined in: `lib/monday/config.ts`

### Single Project Board Queries
```typescript
import { MONDAY_CONFIG } from '@/lib/monday/config'

// Get item by Single Project item ID
const item = await getMondayItemById(singleProjectItemId)

// Get item by Lead ID reference
const item = await getMondayItemByLeadId(leadId)
```

### Lead Board Queries
```typescript
import { LEAD_BOARD_CONFIG } from '@/lib/monday/config'

// Get lead board item
const leadItem = await getLeadBoardItem(leadId)
```

### Data Extraction
```typescript
import { normalizeMondayItemToPaymentDetails } from '@/lib/monday/normalizers'

// Extract payment details from Monday item
const details = normalizeMondayItemToPaymentDetails(item)

// Extracted fields:
// - single_project_item_id
// - lead_id
// - client_name
// - client_email
// - client_phone
// - advance_amount
// - final_amount
// - advance_link
// - final_link
// - monday_snapshot (full data)
```

---

## Data Flow

### Payment Creation Flow
1. Payment URL generated in NeoPay
2. URL stored in Single Project board (`text_mkqxtzec` or `text_mkr2wpca`)
3. Record created in `neopay_payments` table
4. Dashboard syncs details from Monday.com
5. Client info pulled from mirrored columns or Lead board

### Payment Sync Flow
1. User clicks "Sync from Monday" in dashboard
2. System fetches Single Project item by `single_project_item_id`
3. Extracts all relevant columns
4. Updates `payment_request_details` table
5. Logs sync event in `payment_events`

### Resend Flow
1. User clicks "Resend" in dashboard
2. System reads payment URL from `payment_request_details.payment_url`
3. Sends to n8n webhook with Monday metadata
4. n8n sends email to client
5. System logs email in `payment_email_logs`
6. System updates `last_resent_at` timestamp

---

## Status Tracking

### Advance Payment Status
**Column**: `status8`

**Values**:
- `"Pervestas"` = Payment completed/transferred
- Other values may exist (document as discovered)

**Usage**:
```typescript
import { PAYMENT_STATUS_VALUES } from '@/lib/monday/config'

const advanceStatus = getStatusValue(item, MONDAY_CONFIG.COLUMNS.ADVANCE_STATUS)
const isPaid = advanceStatus === PAYMENT_STATUS_VALUES.ADVANCE_PAID
```

### Final Payment Status
**Column**: `color_mkrskyfk`

**Values**: (Document as discovered)

---

## Mirror Columns

Mirror columns automatically sync data between boards.

### Client Email (`mirror95`)
- Mirrors from: Sales Pipeline B2C board
- Source column: `dup__of_email8`
- Updates automatically when Lead board changes

### Client Phone (`mirror76`)
- Mirrors from: Sales Pipeline B2C board
- Source column: `phone9`
- Updates automatically when Lead board changes

---

## Formula Columns

### Final Amount (`formula_mkr2vn7k`)
- Type: Formula
- Calculation: (Document formula if known)
- Returns: Numeric value
- Extraction: Uses `getNumericColumnValue()` helper

---

## Important Notes

1. **Item Name is Built-in**: Client name uses the Monday item name field, not a custom column
2. **Mirror Columns**: Email and phone are mirrored from Lead board, may be empty if not synced
3. **Formula Columns**: Final amount is calculated, not manually entered
4. **Lead ID Reference**: Single Project items reference Lead board via `text_mkr4wv8q`
5. **Status Values**: Must match exact text (case-sensitive)

---

## Testing

### Verify Column IDs
To verify a column ID in Monday.com:
1. Open the board
2. Right-click column header → "Settings"
3. Look at URL or use browser inspector
4. Column ID format: `columntype_randomid`

### Test Queries
```typescript
// Test fetching an item
const item = await getMondayItemById('9999999001')
console.log(item.column_values)

// Check specific column
const email = getColumnValue(item, 'mirror95')
console.log('Client email:', email)
```

---

## Troubleshooting

### Column Returns Null
1. Verify column ID is correct
2. Check if column has value in Monday.com
3. For mirror columns: check source board has data
4. For formula columns: verify formula is valid

### Status Not Detected
1. Check exact status label (case-sensitive)
2. Use `getStatusValue()` helper, not `getColumnValue()`
3. Verify column type is Status

### Amount Parsing Fails
1. Use `getNumericColumnValue()` helper
2. Works with both numeric and formula columns
3. Handles currency symbols and formatting

---

## Configuration Code

See `lib/monday/config.ts` for the complete configuration:

```typescript
export const MONDAY_CONFIG = {
  BOARD_ID: 1645436514,
  COLUMNS: {
    ADVANCE_LINK: 'text_mkqxtzec',
    FINAL_LINK: 'text_mkr2wpca',
    // ... etc
  }
}

export const LEAD_BOARD_CONFIG = {
  BOARD_ID: 1645017543,
  COLUMNS: {
    CLIENT_EMAIL: 'dup__of_email8',
    CLIENT_PHONE: 'phone9',
  }
}
```

---

## Update History

- **2026-05-02**: Complete column mapping documented
  - All payment columns identified
  - Status columns added
  - Amount columns (including formula) added
  - Client info columns confirmed
  - Lead board integration documented
