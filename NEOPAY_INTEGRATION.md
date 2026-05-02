# NeoPay Integration Guide

Complete guide for NeoPay JWT payment URL generation and management.

## Overview

This project integrates with NeoPay (psd2.neopay.lt) to generate secure payment URLs for both advance and final payments. Payment URLs are JWT tokens containing encrypted payment information.

---

## NeoPay Credentials

**Source**: IKRAUTASNEOPAYJWT repository (working production credentials)

```typescript
Project ID: 16155
Secret Key: edEIbadNdqu5UumPqd7Ni9DvBRd8HEMX
Widget URL: https://psd2.neopay.lt/widget.html
```

⚠️ **These credentials are already configured in `.env.local`**

---

## Payment Types

### 1. Advance Payment (Avansas)
- First payment from client
- Typically 30-50% of total project cost
- Transaction ID = Single Project Item ID
- Payment purpose: "Avansinis mokėjimas {transactionId}"

### 2. Final Payment (Galutinis/Likutis)
- Final/remaining payment from client
- Covers balance of project cost
- Transaction ID = Single Project Item ID
- Internal ID = Lead ID
- Payment purpose: "Galutinis mokėjimas {leadId}"

---

## Code Structure

### Generation
**Location**: `lib/neopay/generatePaymentUrl.ts`

Functions:
- `generateAdvancePaymentUrl()` - Generate advance payment URL
- `generateFinalPaymentUrl()` - Generate final payment URL
- `generatePaymentUrl()` - Universal generator (auto-detects type)

### Decoding
**Location**: `lib/neopay/decodePaymentUrl.ts`

Functions:
- `decodeNeoPayUrl()` - Decode any payment URL
- `extractTransactionId()` - Quick transaction ID extraction
- `extractSingleProjectItemId()` - Quick item ID extraction

---

## Usage Examples

### Generate Advance Payment URL

```typescript
import { generateAdvancePaymentUrl } from '@/lib/neopay/generatePaymentUrl'

const result = generateAdvancePaymentUrl({
  amount: 500.00,
  transactionId: '12345',
  singleProjectItemId: '9999999001',
  clientRedirectUrl: 'https://yoursite.com/success', // optional
})

console.log(result.url)
// https://psd2.neopay.lt/widget.html?eyJhbGci...
```

### Generate Final Payment URL

```typescript
import { generateFinalPaymentUrl } from '@/lib/neopay/generatePaymentUrl'

const result = generateFinalPaymentUrl({
  amount: 1500.00,
  leadId: 'LEAD_123',
  singleProjectItemId: '9999999002',
  clientRedirectUrl: 'https://yoursite.com/success', // optional
})

console.log(result.url)
// https://psd2.neopay.lt/widget.html?eyJhbGci...
```

### Universal Generator

```typescript
import { generatePaymentUrl } from '@/lib/neopay/generatePaymentUrl'

// Advance payment
const advance = generatePaymentUrl('advance', {
  amount: 500,
  transactionId: '12345',
  singleProjectItemId: '9999999001',
})

// Final payment
const final = generatePaymentUrl('final', {
  amount: 1500,
  leadId: 'LEAD_123',
  singleProjectItemId: '9999999002',
})
```

### Decode Payment URL

```typescript
import { decodeNeoPayUrl } from '@/lib/neopay/decodePaymentUrl'

const url = 'https://psd2.neopay.lt/widget.html?eyJhbGci...'
const decoded = decodeNeoPayUrl(url)

console.log(decoded.extracted)
// {
//   type: 'advance',
//   amount: 500,
//   currency: 'EUR',
//   transactionId: '12345',
//   singleProjectItemId: '9999999001',
//   paymentPurpose: 'Avansinis mokėjimas 12345'
// }
```

---

## API Endpoints

### Generate Payment URL

**POST** `/api/neopay/generate`

Request body:
```json
{
  "type": "advance",
  "amount": 500.00,
  "transactionId": "12345",
  "singleProjectItemId": "9999999001",
  "clientRedirectUrl": "https://yoursite.com/success"
}
```

Response:
```json
{
  "token": "eyJhbGci...",
  "url": "https://psd2.neopay.lt/widget.html?eyJhbGci...",
  "payload": {
    "projectId": 16155,
    "amount": 500,
    "currency": "EUR",
    "type": "advance",
    ...
  }
}
```

### Decode Payment URL

**POST** `/api/neopay/decode`

Request body:
```json
{
  "link": "https://psd2.neopay.lt/widget.html?eyJhbGci..."
}
```

Response:
```json
{
  "token": "eyJhbGci...",
  "payload": { ... },
  "extracted": {
    "type": "advance",
    "amount": 500,
    "currency": "EUR",
    "transactionId": "12345",
    "singleProjectItemId": "9999999001"
  }
}
```

---

## Resending Payments

### Reuse Existing URL

```typescript
await resendPayment({
  neopayPaymentId: 'uuid-here',
  sentBy: 'dashboard_user',
})
```

### Generate New URL and Resend

```typescript
await resendPayment({
  neopayPaymentId: 'uuid-here',
  generateNew: true,
  amountOverride: 550.00,
  sentBy: 'dashboard_user',
})
```

---

## JWT Payload Structure

### Advance Payment Payload

```json
{
  "projectId": 16155,
  "amount": 500,
  "currency": "EUR",
  "transactionId": "12345",
  "internalId": "12345",
  "singleProjectItemId": "9999999001",
  "type": "advance",
  "paymentPurpose": "Avansinis mokėjimas 12345",
  "serviceType": "pisp",
  "clientRedirectUrl": "https://google.com",
  "defaultLocale": "LT"
}
```

### Final Payment Payload

```json
{
  "projectId": 16155,
  "amount": 1500,
  "currency": "EUR",
  "transactionId": "9999999002",
  "internalId": "LEAD_123",
  "singleProjectItemId": "9999999002",
  "type": "final",
  "paymentPurpose": "Galutinis mokėjimas LEAD_123",
  "serviceType": "pisp",
  "clientRedirectUrl": "https://google.com",
  "defaultLocale": "LT"
}
```

---

## Integration with Dashboard

### Payment List Page
- Shows all payments with type badges
- Click "Resend" to reuse existing URL
- Uses existing payment URL from database

### Payment Detail Page
- Shows decoded payment information
- "Resend" button - reuses existing URL
- Can optionally generate new URL

### Resend Flow
1. Get payment from database
2. Check if payment URL exists
3. If no URL → Generate new one
4. If URL exists → Reuse (or generate new if requested)
5. Send via n8n webhook
6. Log event and email send

---

## Database Storage

### Payment Request Details Table

Stores generated payment URLs:

```sql
payment_url text -- Full NeoPay payment URL
neopay_payload jsonb -- Decoded JWT payload
amount numeric(10,2) -- Payment amount
payment_type text -- 'advance' or 'final'
```

When generating a new payment:
```typescript
const result = generatePaymentUrl(type, params)

await supabase.from('payment_request_details').update({
  payment_url: result.url,
  neopay_payload: result.payload,
  amount: result.payload.amount,
})
```

---

## Security Notes

### ✅ Secure
- JWT tokens are signed with NeoPay secret
- Tokens are self-contained (no external validation needed)
- URLs can be safely shared with clients
- Tokens don't expire (by design)

### ⚠️ Important
- Secret key is stored server-side only
- Never expose `NEOPAY_SECRET` to client
- Payment URLs are public (safe to send via email)
- Each URL should be unique (use unique transaction IDs)

---

## Testing

### Test Advance Payment Generation

```bash
curl -X POST http://localhost:3000/api/neopay/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "advance",
    "amount": 500,
    "transactionId": "TEST_001",
    "singleProjectItemId": "9999999001"
  }'
```

### Test Final Payment Generation

```bash
curl -X POST http://localhost:3000/api/neopay/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "final",
    "amount": 1500,
    "leadId": "LEAD_TEST",
    "singleProjectItemId": "9999999002"
  }'
```

### Test Decoding

```bash
curl -X POST http://localhost:3000/api/neopay/decode \
  -H "Content-Type: application/json" \
  -d '{
    "link": "https://psd2.neopay.lt/widget.html?eyJhbGci..."
  }'
```

---

## Troubleshooting

### "JWT signing failed"
- Check that jsonwebtoken package is installed
- Verify NEOPAY_SECRET is set correctly

### "Invalid token format"
- Ensure URL includes the `?` with token
- Token must have 3 parts separated by `.`

### "Payment URL not found"
- Generate new URL using generateNew: true
- Or sync from Monday to get URL from board

### Generated URL doesn't work
- Verify NeoPay credentials are correct
- Check that projectId is 16155
- Ensure amount is a positive number

---

## Migration from Old System

### Old System (api/index.js)
- Only decoded payment URLs
- Didn't generate new URLs
- Only supported advance payments

### New System
- ✅ Generates advance payment URLs
- ✅ Generates final payment URLs
- ✅ Decodes both types
- ✅ Stores URLs in database
- ✅ Resends with URL generation

---

## Source Files

Original working code from: https://github.com/Chatbots-automated/IKRAUTASNEOPAYJWT

Ported files:
- `generate-neopay-jwt.js` → `lib/neopay/generatePaymentUrl.ts` (advance)
- `generate-final-payment.js` → `lib/neopay/generatePaymentUrl.ts` (final)
- `decode-neopay-token.js` → `lib/neopay/decodePaymentUrl.ts` (enhanced)
- `decode-final-payment.js` → `lib/neopay/decodePaymentUrl.ts` (enhanced)

---

## Future Enhancements

- [ ] Add webhook signature verification from NeoPay
- [ ] Support payment URL expiration
- [ ] Add payment status polling
- [ ] Generate QR codes for payment URLs
- [ ] Support multiple currencies
- [ ] Add payment cancellation
- [ ] Track payment completion via NeoPay webhook

---

## Support

For NeoPay API issues:
- Contact NeoPay support
- Check NeoPay documentation (if available)
- Verify credentials with NeoPay admin panel

For dashboard issues:
- Check `NEOPAY_INTEGRATION.md` (this file)
- Review `lib/neopay/` source code
- Check database migration is complete
