# Payment Control Dashboard - Development Plan

## Current State Analysis

### Technology Stack
- **Platform**: Vercel Serverless Function (single-file)
- **Current File**: `api/index.js` (CommonJS, Node.js 18+)
- **Framework**: Pure Node.js + inline HTML/CSS/JS (no framework)
- **Database**: None currently used in the code
- **Authentication**: None currently implemented

### Existing Functionality

#### 1. NeoPay URL Decoding (`decodeNeoPayUrl` function)
**Location**: `api/index.js` lines 222-240

**What it does**:
- Extracts JWT token from NeoPay payment URL query string
- Base64 decodes the payload
- Extracts structured payment data:
  - `type`: payment type
  - `amount`: payment amount
  - `currency`: payment currency
  - `transactionId`: NeoPay transaction identifier
  - `internalId`: Lead ID
  - `singleProjectItemId`: Monday item ID from Single Project board
  - `paymentPurpose`: payment description

**Status**: ✅ Working, must be preserved and refactored into reusable module

#### 2. Monday.com Integration
**Location**: `api/index.js` lines 242-277

**Existing Configuration**:
```javascript
BOARD_ID: 1645436514 (Single Project board)
COL_ADV_LINK: text_mkqxtzec (advance payment link)
COL_FINAL_LINK: text_mkr2wpca (final payment link)
COL_LEAD_ID: text_mkr4wv8q (lead ID)
COL_ADV_AMOUNT: numeric_mks5kp0t (advance amount)
```

**Functions**:
- `mondayGraphQL(query, variables)`: Generic Monday API caller
- `mondayUpdateCols(itemId, values)`: Update multiple columns
- `updateAdvanceAmountOnly(itemId, amount)`: Update advance amount specifically

**Authentication**: Uses `MONDAY_API_TOKEN` environment variable

**Status**: ✅ Working, must be preserved and expanded for final payment support

#### 3. Current Actions (POST endpoints)

**a) decode**
- Input: `{ link }`
- Output: `{ extracted }` with payment data
- Status: ✅ Working

**b) updateAdvance**
- Input: `{ singleProjectItemId, amount }`
- Updates Monday column `numeric_mks5kp0t` with new advance amount
- Status: ✅ Working, advance-only

**c) sendWebhook**
- Input: `{ link, singleProjectItemId, advanceOverride? }`
- Sends resend request to n8n webhook: `https://n8n-up8s.onrender.com/webhook/77724b7f-99f9-4512-b94f-927d958beb27`
- Payload includes decoded payment data, Monday metadata, overrides
- Status: ✅ Working, advance-only

#### 4. UI Features
- Decode NeoPay link and display payment details
- Update advance amount in Monday
- Send payment link to n8n webhook for resending
- Auto-fill Single Project Item ID from decoded payload

**Status**: ✅ Working but limited (advance-only, no database, no search, no history)

### What's Missing

#### Database Layer
- **Supabase not connected**: No database queries in current code
- `neopay_payments` table exists but is not used
- `settings` table exists but is not used
- No audit trail, no search capability, no payment history

#### Payment Management
- No final payment resend support
- No search/filter capability
- No payment status tracking
- No payment history/timeline
- No email logs
- No webhook receiver

#### Authentication
- No login system
- No user management
- Dashboard is currently public

## Architecture Decision

### Migrate from Single-File Vercel Function to Next.js Application

**Why**:
1. Current single-file approach cannot scale to full dashboard
2. Need proper routing for multiple pages
3. Need React components for rich UI
4. Need API routes for multiple endpoints
5. Need TypeScript for type safety
6. Vercel supports Next.js seamlessly

**Migration Path**:
- Convert to Next.js 14+ (App Router)
- Use TypeScript
- Keep existing Vercel deployment
- Preserve all working logic

## Planned Implementation

### Phase 1: Project Setup & Migration

#### 1.1 Initialize Next.js with TypeScript
```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
```

**Files to create**:
- `tsconfig.json`
- `next.config.js`
- `tailwind.config.ts`
- `app/layout.tsx`
- `app/page.tsx`

#### 1.2 Install Dependencies
```json
{
  "@supabase/supabase-js": "^2.x",
  "jsonwebtoken": "^9.x",
  "jose": "^5.x",
  "zod": "^3.x",
  "date-fns": "^3.x"
}
```

#### 1.3 Migrate Existing Logic to Reusable Modules

**Create**:
- `lib/neopay/decodePaymentUrl.ts` - Port from lines 222-240
- `lib/neopay/types.ts` - TypeScript interfaces for NeoPay payloads
- `lib/monday/client.ts` - Port from lines 242-255
- `lib/monday/config.ts` - Monday board/column configuration
- `lib/monday/updateColumns.ts` - Port from lines 258-277
- `lib/supabase/client.ts` - Supabase client setup
- `lib/supabase/server.ts` - Server-side Supabase client

### Phase 2: Database Schema & Migrations

#### 2.1 Create Supabase Migration

**File**: `supabase/migrations/001_payment_control_tables.sql`

**Tables to Create** (DO NOT TOUCH existing `neopay_payments` and `settings`):

1. **payment_request_details**
   - Links to `neopay_payments(id)`
   - Stores extended payment information for dashboard
   - Includes client info, amounts, URLs, status, timestamps

2. **payment_events**
   - Audit log for all payment-related actions
   - Event types: created, sent, resent, paid, failed, synced, etc.

3. **payment_email_logs**
   - Email send history
   - Provider details, delivery status

4. **Indexes**
   - payment_request_details: lead_id, single_project_item_id, client_email, status, payment_type
   - payment_events: lead_id, single_project_item_id, event_type
   - payment_email_logs: recipient_email

5. **RLS Policies**
   - TODO: Add after Supabase Auth is implemented
   - For now: disable RLS or set permissive policies for development

#### 2.2 Seed Development Data

**File**: `supabase/seed.sql`

Create sample data:
- 3 advance payments (created, sent, paid statuses)
- 2 final payments (sent, failed statuses)
- Related events and email logs

### Phase 3: API Routes (Next.js App Router)

#### 3.1 Core API Endpoints

**app/api/payments/route.ts** - GET
- List/search/filter payments
- Join `neopay_payments` + `payment_request_details`
- Query params: search, payment_type, status, limit, offset

**app/api/payments/[id]/route.ts** - GET
- Get single payment with full details
- Include events, email logs

**app/api/payments/[id]/resend/route.ts** - POST
- Resend payment link (advance or final)
- Validate status (block if paid)
- Log to payment_events and payment_email_logs
- Update last_resent_at

**app/api/payments/[id]/sync-monday/route.ts** - POST
- Fetch data from Monday.com
- Update payment_request_details
- Log sync event

**app/api/neopay/decode/route.ts** - POST
- Use existing decode logic
- Input: `{ link }`
- Output: decoded payload

**app/api/webhooks/neopay/route.ts** - POST
- Receive NeoPay webhook
- Match by transaction_id
- Update payment status
- Log event
- TODO: Add signature verification

#### 3.2 Monday.com Helpers

**lib/monday/config.ts**
```typescript
export const MONDAY_CONFIG = {
  BOARD_ID: 1645436514,
  COLUMNS: {
    ADVANCE_LINK: 'text_mkqxtzec',
    FINAL_LINK: 'text_mkr2wpca',
    LEAD_ID: 'text_mkr4wv8q',
    ADVANCE_AMOUNT: 'numeric_mks5kp0t',
    // TODO: Add final amount, status columns
  }
}
```

**lib/monday/queries.ts**
- `getMondayItemById(itemId)`: Fetch item data
- `getMondayItemByLeadId(leadId)`: Search by lead ID
- `updateMondayColumns(itemId, values)`: Update columns

**lib/monday/normalizers.ts**
- `normalizeMondayItemToPaymentDetails(item)`: Convert Monday data to payment_request_details format

### Phase 4: Dashboard UI

#### 4.1 Pages

**app/page.tsx** - Redirect to /payments or show dashboard home

**app/payments/page.tsx** - Payments List
- Table with columns: client name, email, phone, lead_id, item_id, payment_type, amount, status, created_at, actions
- Search by: name, email, phone, lead_id, item_id, transaction_id
- Filters: payment_type (all/advance/final), status (all/created/sent/resent/paid/failed)
- Pagination
- Click row to view details

**app/payments/[id]/page.tsx** - Payment Detail
- Full payment information
- Timeline of events (payment_events)
- Email logs (payment_email_logs)
- Action buttons: Resend (advance/final), Sync from Monday
- JSON viewers for: monday_snapshot, neopay_payload, email_payload

#### 4.2 Components

**components/ui/** (use shadcn/ui or build custom)
- Table
- Badge (status colors, payment type colors)
- Card
- Button
- Input
- Select
- Dialog/Modal
- Timeline
- JsonViewer

**components/payments/**
- PaymentsList
- PaymentsTable
- PaymentsSearch
- PaymentsFilters
- PaymentDetail
- PaymentTimeline
- PaymentActions
- ResendButton

#### 4.3 Status & Payment Type Badges

**Status Colors**:
- created: gray
- sent: blue
- resent: purple
- paid: green
- failed: red
- expired: orange
- cancelled: gray

**Payment Type Colors**:
- advance: amber
- final: indigo

### Phase 5: Business Logic Services

#### 5.1 Payment Service

**lib/services/paymentService.ts**
```typescript
- createPaymentRequestDetail(neopayPaymentId, data)
- updatePaymentStatus(paymentId, status, metadata?)
- getPaymentById(id)
- searchPayments(filters, pagination)
- resendPaymentLink(paymentId, paymentType)
- syncPaymentFromMonday(paymentId)
```

#### 5.2 Event Logger

**lib/services/eventLogger.ts**
```typescript
- logEvent(paymentId, eventType, message, metadata?)
- getPaymentEvents(paymentId)
```

#### 5.3 Email Service

**lib/services/emailService.ts**
```typescript
- sendPaymentEmail(recipient, subject, body, paymentUrl, metadata)
- logEmailSent(paymentId, emailData)
- getEmailLogs(paymentId)
```

**TODO**: Determine email provider (n8n webhook? SendGrid? AWS SES?)

### Phase 6: Environment Variables

#### .env.local (for development)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Monday.com
MONDAY_API_TOKEN=

# NeoPay
NEOPAY_PROJECT_ID=
NEOPAY_PRIVATE_KEY=

# Email (if not using n8n)
EMAIL_PROVIDER_API_KEY=

# n8n Webhook (existing)
N8N_WEBHOOK_URL=https://n8n-up8s.onrender.com/webhook/77724b7f-99f9-4512-b94f-927d958beb27

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### .env.example
Create template with empty values and comments

### Phase 7: Authentication

**Decision Needed**: Use Supabase Auth or keep simple?

**Option A: Supabase Auth**
- Full auth system
- RLS policies
- User management

**Option B: Simple API Key**
- Middleware checks API key or session
- Simpler for internal tool

**For MVP**: Start without auth, add TODO comments, implement later

### Phase 8: Webhook Integration

#### 8.1 NeoPay Webhook Handler

**app/api/webhooks/neopay/route.ts**
- Receive POST from NeoPay
- TODO: Verify signature (need NeoPay docs)
- Extract transaction_id
- Find matching payment in `neopay_payments`
- Update `payment_request_details.status` and `paid_at` or `error_message`
- Log event

**Unknown**:
- NeoPay webhook signature verification method
- Exact webhook payload structure
- Webhook events (paid, failed, expired?)

#### 8.2 Outgoing Webhooks (n8n)

Keep existing n8n webhook for backward compatibility:
```typescript
// lib/webhooks/n8nClient.ts
export async function sendToN8nWebhook(payload) {
  // Same as current sendWebhook action
}
```

Use for resending until direct email integration is implemented.

## Unknown/Assumptions

### NeoPay
- ✅ JWT decode logic is known (working in current code)
- ❓ Webhook payload structure
- ❓ Webhook signature verification
- ❓ How to generate NEW payment URLs (current code only resends existing)
- ❓ NeoPay API for creating transactions

### Monday.com
- ✅ Single Project board ID: 1645436514
- ✅ Advance payment columns: link, amount, lead ID
- ❓ Final payment amount column ID
- ❓ Payment status column IDs (if they exist)
- ❓ Lead board structure (if separate from Single Project board)
- ❓ Client name/email/phone column IDs

### Email
- Current: n8n webhook handles email sending
- ❓ Should we migrate to direct email provider (SendGrid, AWS SES)?
- ❓ Or keep n8n webhook?

### Database
- ✅ Supabase is the target database
- ✅ `neopay_payments` table structure is known
- ✅ `settings` table exists but purpose unclear
- ❓ Current data in `neopay_payments` - needs inspection
- ❓ Should we backfill `payment_request_details` from existing `neopay_payments` records?

### Authentication
- ❓ Should we use Supabase Auth, simple password, API key, or no auth for MVP?

## Implementation Order

### Sprint 1: Foundation (Current)
1. ✅ Inspect existing codebase
2. ✅ Document current state
3. ⏭️ Initialize Next.js project
4. ⏭️ Setup Supabase client
5. ⏭️ Port existing logic to TypeScript modules
6. ⏭️ Create database migration

### Sprint 2: Core API
7. Create API routes for payments CRUD
8. Implement payment service layer
9. Connect to Supabase
10. Test with seed data

### Sprint 3: Dashboard UI
11. Build payments list page
12. Build payment detail page
13. Implement search and filters
14. Add status badges

### Sprint 4: Resend & Sync
15. Implement resend logic (advance + final)
16. Implement Monday sync
17. Add event logging
18. Add email logging

### Sprint 5: Webhooks & Polish
19. Build NeoPay webhook receiver
20. Test end-to-end flows
21. Add error handling
22. Add loading states
23. Add validation

### Sprint 6: Authentication & Security
24. Implement authentication (Supabase Auth or simple)
25. Add RLS policies
26. Protect routes
27. Add audit logging

## Files to Create

### Configuration
- `next.config.js`
- `tsconfig.json`
- `tailwind.config.ts`
- `.env.example`
- `.env.local` (not committed)

### Database
- `supabase/migrations/001_payment_control_tables.sql`
- `supabase/seed.sql`

### Libraries
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/neopay/decodePaymentUrl.ts`
- `lib/neopay/types.ts`
- `lib/monday/client.ts`
- `lib/monday/config.ts`
- `lib/monday/queries.ts`
- `lib/monday/normalizers.ts`
- `lib/services/paymentService.ts`
- `lib/services/eventLogger.ts`
- `lib/services/emailService.ts`
- `lib/webhooks/n8nClient.ts`
- `lib/utils.ts`

### API Routes
- `app/api/payments/route.ts`
- `app/api/payments/[id]/route.ts`
- `app/api/payments/[id]/resend/route.ts`
- `app/api/payments/[id]/sync-monday/route.ts`
- `app/api/neopay/decode/route.ts`
- `app/api/webhooks/neopay/route.ts`

### Pages
- `app/layout.tsx`
- `app/page.tsx`
- `app/payments/page.tsx`
- `app/payments/[id]/page.tsx`

### Components
- `components/ui/table.tsx`
- `components/ui/badge.tsx`
- `components/ui/card.tsx`
- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/select.tsx`
- `components/ui/dialog.tsx`
- `components/payments/PaymentsList.tsx`
- `components/payments/PaymentsTable.tsx`
- `components/payments/PaymentsSearch.tsx`
- `components/payments/PaymentsFilters.tsx`
- `components/payments/PaymentDetail.tsx`
- `components/payments/PaymentTimeline.tsx`
- `components/payments/PaymentActions.tsx`
- `components/payments/StatusBadge.tsx`
- `components/payments/PaymentTypeBadge.tsx`
- `components/payments/JsonViewer.tsx`

### Types
- `types/payment.ts`
- `types/neopay.ts`
- `types/monday.ts`

## Files to Preserve

### DO NOT DELETE
- `api/index.js` - Keep as reference until full migration is verified
- Current working NeoPay decode logic (lines 222-240)
- Current Monday integration logic (lines 242-277)
- Monday board/column IDs (lines 21-25)
- n8n webhook URL (line 27)

### Migration Strategy
1. Create new Next.js structure alongside `api/index.js`
2. Port logic to TypeScript modules
3. Test new implementation
4. Once verified, either:
   - Delete `api/index.js` and remove from `package.json`, OR
   - Keep as backup/reference with clear comment

## Critical Rules

### Database
- ✅ DO NOT touch `neopay_payments` table structure
- ✅ DO NOT touch `settings` table
- ✅ DO create new tables that reference `neopay_payments`
- ✅ DO add indexes for performance

### Logic Preservation
- ✅ DO preserve NeoPay JWT decode logic exactly
- ✅ DO preserve Monday GraphQL integration
- ✅ DO preserve existing advance payment resend
- ✅ DO extend to support final payments using same pattern

### Code Quality
- ✅ DO use TypeScript strict mode
- ✅ DO add TODO comments for unknowns
- ✅ DO NOT hardcode Monday column IDs in UI
- ✅ DO NOT commit secrets
- ✅ DO separate concerns (UI, API, services, database)

### Security
- ✅ DO NOT expose service role keys to frontend
- ✅ DO NOT expose Monday token to frontend
- ✅ DO NOT expose NeoPay private key to frontend
- ✅ DO validate all inputs
- ✅ DO add authentication (even if simple for MVP)

## Next Immediate Action

Initialize Next.js project with TypeScript and begin porting existing logic to reusable modules.
