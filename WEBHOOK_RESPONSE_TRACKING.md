# Webhook Response Tracking & Send History

## Overview

The dashboard now captures and stores n8n webhook responses, providing a complete send history for each payment. This allows you to see when payments were sent, what data was sent, and what the webhook returned.

## What Was Implemented

### 1. Webhook Response Storage

**New Database Table:** `webhook_responses`

Stores every send attempt and webhook response:
- Request payload sent to n8n
- Response status code
- Response body (JSON)
- Parsed payment data from response
- Success/failure status
- Timestamp and user who sent it

**Migration File:** `supabase/migrations/002_webhook_responses.sql`

### 2. Response Capture

When you click "Išsiųsti mokėjimą" (Send Payment):

1. **Request is sent** to n8n webhook
2. **Response is received** from n8n with this structure:
   ```json
   {
     "success": true,
     "payment": {
       "lead_id": "11707764861",
       "single_project_item_id": "11741781280",
       "amount": 500,
       "type": "final"
     }
   }
   ```
3. **Response is saved** to `webhook_responses` table
4. **History is displayed** on the payment detail page

### 3. Send History Display

On the payment detail page, there's now a new section:

**"Siuntimo istorija (Webhook atsakymai)"** (Send History - Webhook Responses)

Shows:
- ✓ Success/✗ Failure badge
- HTTP status code
- Response data (lead_id, item_id, amount, type)
- Timestamp
- Who sent it
- Error messages (if any)

### 4. Fixed Search Functionality

The search (Paieška) now works across:
- Client name (`client_name`)
- Client email (`client_email`)
- Client phone (`client_phone`)
- Lead ID (`lead_id`)
- Item ID (`single_project_item_id`)
- Transaction ID (`transaction_id`)

**Previous Issue:** Search only looked in `neopay_payments` table.

**Fixed:** Now searches both `neopay_payments` AND `payment_request_details` tables.

### 5. "Generuoti naują mokėjimo nuorodą" Explanation

Added dynamic explanation text:

**When UNCHECKED (default):**
> "Bus panaudota esama mokėjimo nuoroda (jei egzistuoja)"
>
> Will use the existing payment URL (if it exists)

**When CHECKED:**
> "✓ Bus sukurta nauja NeoPay JWT nuoroda su atnaujinta suma ir transaction ID"
>
> Will create a new NeoPay JWT URL with updated amount and transaction ID

## How It Works

### Send Flow with Response Capture

```
1. User clicks "Išsiųsti mokėjimą"
   ↓
2. Dashboard prepares payload
   ↓
3. Sends to n8n webhook
   ↓
4. n8n processes and returns response:
   {
     "success": true,
     "payment": { ... }
   }
   ↓
5. Dashboard saves response to webhook_responses table
   ↓
6. Response appears in "Siuntimo istorija"
```

### Database Schema

**webhook_responses table:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `neopay_payment_id` | uuid | FK to neopay_payments |
| `payment_request_detail_id` | uuid | FK to payment_request_details |
| `webhook_url` | text | n8n webhook URL |
| `request_payload` | jsonb | What was sent |
| `response_status` | integer | HTTP status (200, 500, etc) |
| `response_body` | jsonb | Full response JSON |
| `success` | boolean | Whether it succeeded |
| `lead_id` | text | From response |
| `single_project_item_id` | text | From response |
| `amount` | numeric | From response |
| `payment_type` | text | From response ('advance' or 'final') |
| `error_message` | text | Error if failed |
| `sent_by` | text | User who triggered send |
| `created_at` | timestamptz | When sent |

## Usage Examples

### Viewing Send History

1. Go to any payment detail page (`/payments/[id]`)
2. Scroll to **"Siuntimo istorija (Webhook atsakymai)"** section
3. See all send attempts with their responses

### Understanding Success/Failure

**Success (Green Badge):**
```
✓ Sėkminga | HTTP 200
```
- Webhook returned `{ "success": true }`
- Payment was sent successfully
- Response data is displayed

**Failure (Red Badge):**
```
✗ Nepavyko | HTTP 500
```
- Webhook returned error or `{ "success": false }`
- Error message is shown
- Request can be retried

### Response Data Fields

Each webhook response shows:

```
Lead ID: 11707764861
Item ID: 11741781280
Suma: 500.00 €
Tipas: final
```

This confirms what data n8n received and processed.

## Setup Instructions

### 1. Run Database Migration

Go to your Supabase dashboard and run:

```sql
-- File: supabase/migrations/002_webhook_responses.sql
-- Copy and paste the entire file contents into Supabase SQL Editor
```

Or use the migration script:

```bash
# If you have Supabase CLI
supabase db push
```

### 2. Verify Table Creation

Check that the table exists:

```sql
SELECT * FROM webhook_responses LIMIT 1;
```

### 3. Test Send

1. Go to any payment
2. Click "Išsiųsti mokėjimą"
3. Send a test payment
4. Refresh the page
5. Check "Siuntimo istorija" section

You should see the webhook response!

## Search Functionality

### How to Use Search

On the payments list page (`/payments`):

1. Type in the **"Paieška"** field
2. Search by:
   - Client name (e.g., "Erikas")
   - Email (e.g., "client@example.com")
   - Phone (e.g., "+370...")
   - Lead ID (e.g., "11707764861")
   - Item ID (e.g., "11741781280")
   - Transaction ID (e.g., "1174")

3. Results update automatically

### Search Performance

- Searches across 2 tables simultaneously
- Uses database indexes for speed
- Case-insensitive (ilike)
- Partial matching supported

## API Changes

### Updated: `sendToN8nWebhook()`

**Before:**
```typescript
export async function sendToN8nWebhook(...): Promise<void>
```

**After:**
```typescript
export async function sendToN8nWebhook(...): Promise<N8nWebhookResponse>
```

Now returns the webhook response instead of void.

### New Service: `webhookResponseService.ts`

**Functions:**
- `logWebhookResponse()` - Saves response to database
- `getWebhookResponseHistory()` - Gets all responses for a payment

### Updated: `PaymentDetailView` Type

**Before:**
```typescript
export interface PaymentDetailView {
  payment: NeoPayPayment
  details?: PaymentRequestDetail | null
  events: PaymentEvent[]
  emailLogs: PaymentEmailLog[]
}
```

**After:**
```typescript
export interface PaymentDetailView {
  payment: NeoPayPayment
  details?: PaymentRequestDetail | null
  events: PaymentEvent[]
  emailLogs: PaymentEmailLog[]
  webhookResponses: WebhookResponse[] // NEW
}
```

## Troubleshooting

### "Siuntimo istorija" section is empty

**Possible causes:**
1. Migration not run yet
2. No payments have been sent since implementing this feature
3. Webhook responses failed to save

**Solution:**
1. Run the migration: `002_webhook_responses.sql`
2. Send a test payment
3. Check server logs for errors

### Search not working

**Possible causes:**
1. Empty `payment_request_details` table
2. No data synced from Monday.com yet

**Solution:**
1. Run the Monday.com sync: Click "🔄 Sinchronizuoti iš Monday"
2. Wait for completion
3. Try searching again

### Webhook response shows error

**This is normal!** Errors are tracked for debugging:

1. Check the error message in the response
2. Verify n8n webhook is working
3. Check n8n logs for details
4. Retry the send

## Benefits

### 1. Complete Audit Trail

See exactly when and how each payment was sent:
- Request timestamp
- Request payload
- Response from webhook
- Success/failure status

### 2. Debugging Support

When something goes wrong:
- See the exact error message
- Compare request vs response
- Trace through send history
- Identify patterns in failures

### 3. Client Support

When a client says "I didn't receive the payment link":
- Check send history
- Verify if webhook succeeded
- See exact data that was sent
- Confirm email address used

### 4. Analytics (Future)

With send history stored:
- Calculate success rate
- Identify problematic payments
- Track resend frequency
- Monitor webhook performance

## Files Created/Modified

### New Files
- `supabase/migrations/002_webhook_responses.sql` - Database migration
- `lib/services/webhookResponseService.ts` - Webhook response logging service
- `WEBHOOK_RESPONSE_TRACKING.md` - This documentation

### Modified Files
- `lib/webhooks/n8nClient.ts` - Now returns webhook response
- `lib/services/paymentService.ts` - Captures and logs responses, improved search
- `types/payment.ts` - Added `WebhookResponse` type
- `app/payments/[id]/page.tsx` - Shows send history section
- `app/api/payments/[id]/route.ts` - Includes webhook responses in detail view

## Next Steps

### Short Term
- [ ] Add webhook response filtering (success/failure)
- [ ] Add retry button for failed sends
- [ ] Show response in real-time (toast notification)

### Medium Term
- [ ] Webhook response analytics dashboard
- [ ] Success rate charts
- [ ] Email notification for failures
- [ ] Bulk resend for failed payments

### Long Term
- [ ] Webhook signature verification
- [ ] Multiple webhook provider support
- [ ] Webhook response comparison tool
- [ ] Automated retry logic for failures

## Summary

You can now:

1. ✅ **See complete send history** for each payment
2. ✅ **Track webhook responses** with full request/response data
3. ✅ **Search payments** by client name, email, phone, and IDs
4. ✅ **Understand "Generuoti naują mokėjimo nuorodą"** checkbox
5. ✅ **Debug send failures** with error messages
6. ✅ **Audit all send attempts** with timestamps and users

Every time you click "Išsiųsti mokėjimą", the webhook response is captured and stored automatically!
