# Monday.com Sync Guide

## Overview

The Payment Control Dashboard automatically syncs payment data from Monday.com to display historical and current payments.

## How It Works

The sync system:

1. **Fetches** all items from Monday.com Single Project board (ID: `1645436514`)
2. **Extracts** payment URLs from:
   - Advance payment column: `text_mkqxtzec`
   - Final payment column: `text_mkr2wpca`
3. **Decodes** NeoPay JWT tokens from the URLs
4. **Creates** payment records in the database (`neopay_payments` + `payment_request_details`)
5. **Stores** client info, amounts, and Monday snapshots

## Sync Methods

### 1. Manual Sync (One-time Initial Import)

**Use this first to import historical data:**

1. Go to the Payments page (`/payments`)
2. Click **"🔄 Sinchronizuoti iš Monday"** button
3. Confirm the action
4. Wait for completion (may take 2-5 minutes for large datasets)

The sync will:
- Find ~1100 Monday items (based on your year of data)
- Create payment records for any that have payment URLs
- Skip duplicates automatically
- Show results: total items, advance payments synced, final payments synced, errors

### 2. Auto-Refresh (Hourly)

**Enable ongoing automatic sync:**

1. Go to the Payments page (`/payments`)
2. Check the **"Auto-atnaujinimas (1h)"** checkbox
3. The system will automatically sync every hour while the page is open

**Note:** This only works while the browser tab is active. For true background syncing, use Cron (see below).

### 3. Cron Job (Automatic Background Sync)

**For production deployment on Vercel:**

The `vercel.json` file is already configured to run a sync every hour:

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

This will:
- Run automatically every hour (at minute 0)
- Sync all new payments from Monday.com
- Skip existing records
- Run in the background, even when no one is using the dashboard

**Cron Schedule Format:**
- `0 * * * *` = Every hour
- `0 */2 * * *` = Every 2 hours
- `0 0 * * *` = Daily at midnight
- `*/30 * * * *` = Every 30 minutes

### 4. API Endpoint (Manual Trigger)

You can also trigger a sync via API:

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

## What Gets Synced

For each Monday.com item with payment URLs, the system syncs:

### From Monday.com Single Project Board
- **Item ID** (`single_project_item_id`)
- **Client name** (item.name)
- **Client email** (from mirror column `mirror95`)
- **Client phone** (from mirror column `mirror76`)
- **Lead ID** (from column `text_mkr4wv8q`)
- **Advance amount** (from column `numeric_mks5kp0t`)
- **Final amount** (from column `formula_mkr2vn7k`)
- **Advance payment URL** (from column `text_mkqxtzec`)
- **Final payment URL** (from column `text_mkr2wpca`)
- **Full item snapshot** (stored as JSON)

### From NeoPay JWT Token
- **Transaction ID**
- **Payment details** (amount, currency, etc.)
- **Decoded payload** (stored as JSON)

### From Lead Board (if available)
- **Client email** (from column `dup__of_email8`)
- **Client phone** (from column `phone9`)

## Duplicate Prevention

The sync is **idempotent** - safe to run multiple times:

- Checks for existing `transaction_id` before creating
- Skips records that already exist
- Only adds new payments
- Never creates duplicates

## Performance

**Initial sync timing:**
- ~100 items: ~30 seconds
- ~500 items: ~2-3 minutes
- ~1100 items: ~4-5 minutes

**Why?**
- Monday.com API pagination (100 items per request)
- JWT decoding for each payment URL
- Database inserts with validation
- Event logging for audit trail

## Troubleshooting

### "Very few rows showing"

**Problem:** Only seeing recent payments, not historical data.

**Solution:** Run the manual sync button once to import all historical data from Monday.com.

### "Sync taking too long"

**Problem:** Sync appears stuck or very slow.

**Possible causes:**
1. Monday.com API rate limiting
2. Network issues
3. Large dataset (1000+ items)

**Solution:** 
- Wait patiently (can take 5+ minutes for 1000+ items)
- Check browser console for progress logs
- Check server logs in Vercel dashboard

### "Some payments not syncing"

**Possible causes:**
1. Payment URL column is empty in Monday.com
2. Invalid JWT token in payment URL
3. Missing required fields (lead_id, item_id)

**Solution:**
- Check the sync results for error count
- Review server logs for specific errors
- Verify Monday.com data integrity

### "Duplicate payments appearing"

**Should not happen** - the sync has duplicate prevention.

If this occurs:
1. Check if `transaction_id` is unique
2. Review database for duplicate records
3. Report bug with details

## Monitoring

### Check Sync Status

View cron job logs in Vercel dashboard:
1. Go to your Vercel project
2. Click "Logs"
3. Filter by `/api/cron/sync-monday`
4. Check for errors or success messages

### Manual Health Check

```bash
curl http://localhost:3000/api/sync/monday
```

Returns:
```json
{
  "endpoint": "/api/sync/monday",
  "method": "POST",
  "description": "Syncs all payments from Monday.com to database",
  "usage": "POST to this endpoint to trigger a full sync"
}
```

## Best Practices

1. **Initial Setup:**
   - Run manual sync once to import historical data
   - Enable auto-refresh for ongoing monitoring
   - Deploy to Vercel to enable cron job

2. **Regular Use:**
   - Let cron job handle automatic syncing
   - Use manual sync only when you notice missing data
   - Enable auto-refresh when actively monitoring payments

3. **Production:**
   - Add `CRON_SECRET` environment variable
   - Uncomment authorization check in `app/api/cron/sync-monday/route.ts`
   - Monitor cron job logs for failures
   - Set up alerts for sync errors (future feature)

## API Reference

### Sync Endpoints

#### `POST /api/sync/monday`
Manually trigger a full sync.

**Response:**
```typescript
{
  success: boolean
  message: string
  results: {
    total: number          // Total Monday items processed
    advanceSynced: number  // New advance payments synced
    finalSynced: number    // New final payments synced
    errors: number         // Failed sync attempts
  }
}
```

#### `GET /api/cron/sync-monday`
Automated cron endpoint (Vercel crons).

**Headers:**
- `Authorization: Bearer ${CRON_SECRET}` (required in production)

**Response:**
```typescript
{
  success: boolean
  timestamp: string
  results: {
    total: number
    advanceSynced: number
    finalSynced: number
    errors: number
  }
}
```

## Next Steps

Future enhancements:
- [ ] Real-time sync via Monday.com webhooks
- [ ] Incremental sync (only new/updated items)
- [ ] Sync status dashboard page
- [ ] Email alerts for sync failures
- [ ] Sync history/audit log
- [ ] Selective sync by date range
- [ ] Sync specific Monday board columns on demand
