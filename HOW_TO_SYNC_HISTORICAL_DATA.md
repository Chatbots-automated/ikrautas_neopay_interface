# How to Sync Historical Payment Data

## Problem

You're seeing "very little actual rows" in the dashboard even though the system has been running for about a year.

**Why?** The `neopay_payments` table only contains manually created records. Historical payments from Monday.com haven't been imported yet.

## Solution: Import All Historical Data

Follow these steps to import all your historical payment data from Monday.com:

### Step 1: Ensure Database Migration is Complete

First, make sure the database tables exist:

1. Go to your Supabase dashboard
2. Open SQL Editor
3. Run the safe migration file if you haven't already:

```sql
-- Copy contents from: supabase/migrations/001_payment_control_tables_safe.sql
-- This is safe to run multiple times
```

Or check if tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('neopay_payments', 'payment_request_details', 'payment_events', 'payment_email_logs');
```

You should see all 4 tables.

### Step 2: Start the Dev Server

```bash
npm run dev
```

### Step 3: Trigger the Initial Sync

Open your browser and go to:
```
http://localhost:3000/payments
```

You'll see the payments list page with a new button: **"🔄 Sinchronizuoti iš Monday"**

Click the button and confirm the action.

### Step 4: Wait for Completion

The sync will:
- Fetch ALL items from Monday.com (board ID: `1645436514`)
- Process each item to extract payment URLs
- Decode NeoPay JWT tokens
- Create payment records in the database
- Show a summary when complete

**Expected time:**
- ~100 items: 30 seconds
- ~500 items: 2-3 minutes
- ~1100 items: 4-5 minutes

### Step 5: Verify the Results

After the sync completes, you'll see a popup like:

```
Sinchronizacija baigta!

Iš viso: 1100 Monday įrašų
Avanso mokėjimų: 450
Galutinių mokėjimų: 380
Klaidų: 2
```

The payments list will automatically refresh and show all historical data.

## Alternative Method: API Call

If you prefer, you can trigger the sync via API:

```bash
curl -X POST http://localhost:3000/api/sync/monday
```

Response:
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "results": {
    "total": 1100,
    "advanceSynced": 450,
    "finalSynced": 380,
    "errors": 2
  }
}
```

## Automatic Ongoing Sync

After the initial import, you have two options for keeping data up-to-date:

### Option 1: Auto-Refresh (Browser-Based)

On the payments page, check the **"Auto-atnaujinimas (1h)"** checkbox.

- The system will sync every hour while your browser tab is open
- Good for active monitoring
- Stops when you close the tab

### Option 2: Cron Job (Production)

When you deploy to Vercel, automatic hourly syncing is already configured:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-monday",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs in the background every hour, even when no one is using the dashboard.

## What Gets Synced

The sync imports:

### For Each Payment
- Transaction ID (from NeoPay JWT)
- Lead ID (from Monday column `text_mkr4wv8q`)
- Single Project Item ID (from Monday item ID)
- Payment Type (advance or final)
- Client Name (from Monday item name)
- Client Email (from Monday column `mirror95` or Lead board `dup__of_email8`)
- Client Phone (from Monday column `mirror76` or Lead board `phone9`)
- Amount (from Monday columns `numeric_mks5kp0t` or `formula_mkr2vn7k`)
- Payment URL (from Monday columns `text_mkqxtzec` or `text_mkr2wpca`)
- Full Monday snapshot (JSON)
- Decoded NeoPay payload (JSON)

## Duplicate Prevention

Don't worry about running the sync multiple times:

- The system checks for existing `transaction_id` before creating records
- Duplicates are automatically skipped
- Only new payments are added
- Safe to run as many times as needed

## Troubleshooting

### "Still seeing few rows after sync"

**Check:**
1. Did the sync complete successfully? (Check the popup message)
2. Are payment URLs present in Monday.com? (Empty URLs won't sync)
3. Check browser console for errors (F12 → Console tab)
4. Check server logs in terminal

### "Sync is taking forever"

**Normal for large datasets:**
- 1100+ items can take 5+ minutes
- Monday.com API has rate limits
- Each payment URL must be decoded
- Database inserts happen sequentially for safety

**Check progress:**
- Look at terminal/server logs: `Syncing item X of Y...`
- Wait patiently - it will complete

### "Some payments didn't sync"

**Possible reasons:**
1. Payment URL column is empty in Monday.com
2. Invalid JWT token (malformed URL)
3. Missing required fields (lead_id, item_id)

**Check the error count** in the sync results popup. If `Klaidų: 0`, all payments synced successfully.

## Next Steps

After syncing historical data:

1. ✅ **All past payments** are now in the dashboard
2. ✅ **Search** works across all historical data
3. ✅ **Filters** show accurate counts
4. ✅ **Auto-sync** keeps data fresh going forward

You can now:
- Search for any client from the past year
- View payment history and timelines
- Resend payments
- Sync individual payments from Monday
- Monitor all payment activity in one place

## Questions?

See the full documentation:
- `MONDAY_SYNC_GUIDE.md` - Detailed sync documentation
- `README.md` - General project documentation
- `SETUP_INSTRUCTIONS.md` - Setup guide
