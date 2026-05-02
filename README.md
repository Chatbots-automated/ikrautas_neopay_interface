# Payment Control Dashboard

Modern payment management dashboard for NeoPay and Monday.com integration.

## Overview

This application provides a comprehensive control center for managing NeoPay payment links integrated with Monday.com CRM. It tracks advance and final payments, provides audit trails, and enables manual resending of payment links.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Integrations**: 
  - Monday.com API
  - NeoPay (JWT-based payment URLs)
  - n8n webhooks (for email sending)

## Features

- ✅ Payment list with **working search** across all fields (name, email, phone, IDs)
- ✅ Payment detail view with full audit trail
- ✅ **Webhook response tracking** (complete send history)
- ✅ Manual resend for advance and final payments
- ✅ **Monday.com full synchronization** (import all historical data)
- ✅ **Auto-refresh** (hourly sync from Monday.com)
- ✅ **Cron job support** (automatic background sync on Vercel)
- ✅ NeoPay URL generation and decoding
- ✅ Event logging and email tracking
- ✅ Status tracking (created, sent, resent, paid, failed, expired)
- 🚧 NeoPay webhook receiver (needs signature verification)
- 🚧 Authentication system (placeholder)

## Project Structure

```
.
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── payments/             # Payment CRUD endpoints
│   │   ├── neopay/               # NeoPay utilities
│   │   └── webhooks/             # Webhook receivers
│   ├── payments/                 # Payment pages
│   └── layout.tsx                # Root layout
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   └── payments/                 # Payment-specific components
├── lib/                          # Core business logic
│   ├── monday/                   # Monday.com integration
│   ├── neopay/                   # NeoPay utilities
│   ├── services/                 # Service layer
│   ├── supabase/                 # Database clients
│   └── webhooks/                 # Webhook clients
├── types/                        # TypeScript type definitions
├── supabase/                     # Database migrations & seeds
│   ├── migrations/               # SQL migrations
│   └── seed.sql                  # Development seed data
└── api/                          # [LEGACY] Old single-file function
    └── index.js                  # ⚠️ Deprecated - kept for reference
```

## Database Schema

### Core Tables (DO NOT MODIFY)
- `public.neopay_payments` - Base payment records (preserved from original)
- `public.settings` - Application settings (preserved from original)

### New Tables
- `public.payment_request_details` - Extended payment information
- `public.payment_events` - Audit trail
- `public.payment_email_logs` - Email send history

See `supabase/migrations/001_payment_control_tables.sql` for full schema.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Monday.com
MONDAY_API_TOKEN=your-monday-token

# NeoPay
NEOPAY_PROJECT_ID=your-project-id
NEOPAY_PRIVATE_KEY=your-private-key

# n8n Webhook (existing)
N8N_WEBHOOK_URL=https://n8n-up8s.onrender.com/webhook/77724b7f-99f9-4512-b94f-927d958beb27

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

Run the migration in your Supabase dashboard:

```bash
# Copy contents of supabase/migrations/001_payment_control_tables.sql
# and run in Supabase SQL Editor
```

Optional: Load seed data for development:

```bash
# Copy contents of supabase/seed.sql
# and run in Supabase SQL Editor
```

### 3. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your actual credentials
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### 5. Run Additional Migrations

For webhook response tracking (send history):

Go to Supabase SQL Editor and run:
```sql
-- File: supabase/migrations/002_webhook_responses.sql
```

### 6. Import Historical Data (IMPORTANT!)

**If you have existing payment data in Monday.com:**

1. Go to `/payments` page
2. Click **"🔄 Sinchronizuoti iš Monday"** button
3. Wait for completion (may take 5+ minutes for 1000+ items)

This will import ALL historical payments from Monday.com into the dashboard.

📖 See **`HOW_TO_SYNC_HISTORICAL_DATA.md`** for detailed instructions.

## Usage

### Syncing Historical Data

**Problem:** "I only see a few rows, but the system has been running for a year!"

**Solution:** Use the Monday.com sync feature to import all historical data:

1. Click **"🔄 Sinchronizuoti iš Monday"** button on the payments page
2. Confirm the action
3. Wait for completion
4. All historical payments will now appear

See `HOW_TO_SYNC_HISTORICAL_DATA.md` and `MONDAY_SYNC_GUIDE.md` for complete documentation.

### Auto-Refresh

Enable automatic hourly refresh:

1. Go to `/payments`
2. Check **"Auto-atnaujinimas (1h)"** checkbox
3. Payments will sync every hour while the page is open

### Viewing Payments

Navigate to `/payments` to see the list of all payments. Use the search and filter controls to find specific payments.

### Payment Details

Click on any payment to view its full details, including:
- Client information
- Payment amounts and status
- Event timeline
- Email send history
- Monday.com snapshot
- NeoPay payload

### Resending Payment Links

On the payment detail page, click "Išsiųsti iš naujo" to resend the payment link via n8n webhook. This works for both advance and final payments.

### Syncing from Monday.com

Click "Sinchronizuoti iš Monday" to fetch the latest data from Monday.com and update the payment details.

## API Routes

### GET /api/payments
List and search payments.

Query params:
- `search` - Search term (client name, email, phone, IDs)
- `paymentType` - Filter by type: `advance`, `final`, or `all`
- `status` - Filter by status: `created`, `sent`, `resent`, `paid`, `failed`, `expired`, `all`
- `limit` - Pagination limit (default: 50)
- `offset` - Pagination offset (default: 0)

### GET /api/payments/[id]
Get single payment with details, events, and email logs.

### POST /api/payments/[id]/resend
Resend payment link.

Body:
```json
{
  "paymentUrl": "optional-override-url",
  "amountOverride": 123.45,
  "sentBy": "user@example.com"
}
```

### POST /api/payments/[id]/sync-monday
Sync payment details from Monday.com.

### POST /api/neopay/decode
Decode a NeoPay payment URL.

Body:
```json
{
  "link": "https://psd2.neopay.lt/widget.html?eyJhbGci..."
}
```

### POST /api/webhooks/neopay
Receive NeoPay webhook notifications.

⚠️ TODO: Add signature verification.

## Monday.com Configuration

The application integrates with two Monday.com boards:

### Single Project Board (ITEM ID): `1645436514`

**Payment URLs:**
- `text_mkqxtzec` - Advance payment URL
- `text_mkr2wpca` - Final payment URL

**Amounts:**
- `numeric_mks5kp0t` - Advance payment amount
- `formula_mkr2vn7k` - Final payment amount (formula)
- `text_mkr11k1z` - Deal value without VAT

**Status:**
- `status8` - Advance payment status ("Pervestas" = paid)
- `color_mkrskyfk` - Final payment status

**Client Information:**
- `item.name` - Client name (built-in field)
- `mirror95` - Client email (mirrored)
- `mirror76` - Client phone (mirrored)

**References:**
- `text_mkr4wv8q` - Lead ID (reference to Sales Pipeline B2C board)

### Lead Board (LEAD ID): `11672945094`

**Client Information:**
- `item.name` - Client name (built-in field)
- `dup__of_email8` - Client email
- `phone9` - Client phone

All configuration is stored in `lib/monday/config.ts`.

## Development Notes

### Preserved Logic

The following logic from the original `api/index.js` has been preserved and refactored:

1. NeoPay JWT decoding (`lib/neopay/decodePaymentUrl.ts`)
2. Monday.com GraphQL client (`lib/monday/client.ts`)
3. Monday column updates (`lib/monday/queries.ts`)
4. n8n webhook integration (`lib/webhooks/n8nClient.ts`)

### Known TODOs

- [ ] Add authentication (Supabase Auth or simple API key)
- [ ] Enable RLS policies on new tables
- [ ] Add NeoPay webhook signature verification
- [ ] Confirm exact NeoPay webhook payload structure
- [ ] Add Monday.com column IDs for:
  - Final amount
  - Payment status columns
  - Client name, email, phone
- [ ] Add direct email provider integration (optional, currently using n8n)
- [ ] Add pagination for payment list
- [ ] Add export functionality
- [ ] Add payment creation flow (currently only manages existing payments)

## Deployment

This project is designed to be deployed on Vercel.

1. Push to GitHub
2. Import project to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

The old `api/index.js` serverless function will continue to work if needed, but the new Next.js routes are the primary implementation.

## Migration from Old Version

The original single-file Vercel function (`api/index.js`) has been refactored into a full Next.js application. The old file is kept for reference but should not be used.

Key changes:
- Single HTML page → React components
- Inline JS → TypeScript modules
- No database → Supabase integration
- Manual actions only → Full CRUD + audit trail

## Documentation

This project includes comprehensive documentation:

### Setup & Getting Started
- **`README.md`** (this file) - Project overview and quick start
- **`SETUP_INSTRUCTIONS.md`** - Detailed setup guide
- **`QUICK_START.md`** - Quick start guide
- **`PROJECT_SUMMARY.md`** - High-level project summary

### Feature Documentation
- **`WHATS_NEW.md`** - ⭐ Latest updates and new features
- **`WEBHOOK_RESPONSE_TRACKING.md`** - Send history and webhook tracking
- **`HOW_TO_SYNC_HISTORICAL_DATA.md`** - How to import historical payments
- **`MONDAY_SYNC_GUIDE.md`** - Complete Monday.com sync documentation
- **`MONDAY_CONFIGURATION.md`** - Monday board/column mappings
- **`NEOPAY_INTEGRATION.md`** - NeoPay JWT generation and decoding

### Development
- **`DEVELOPMENT_PLAN.md`** - Development roadmap and architecture

### Important Files
- **`api/index.js`** - Original deprecated Vercel function (reference only)
- **`supabase/migrations/`** - Database migrations
- **`supabase/seed.sql`** - Development seed data

## Support

For questions or issues, refer to:
- The documentation files above
- Monday.com board for business logic
- NeoPay documentation (if available)

## License

Private project - not for public distribution.
