# Setup Instructions

## 1. Database Migration

The new payment control tables need to be added to your Supabase database.

### Run the Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/eihrowcpckmabxcsyovd
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `supabase/migrations/001_payment_control_tables.sql`
5. Paste into the SQL Editor
6. Click "Run" or press Cmd/Ctrl + Enter

This will create the following NEW tables (without touching `neopay_payments` or `settings`):
- `payment_request_details`
- `payment_events`
- `payment_email_logs`

### Optional: Load Seed Data

For development/testing, you can load sample data:

1. In the same SQL Editor
2. Click "New Query"
3. Copy the entire contents of `supabase/seed.sql`
4. Paste and run

This creates 5 test payments with complete history.

## 2. Start the Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

## 3. Access the Dashboard

Navigate to http://localhost:3000/payments to see the payment control dashboard.

## What's Working

✅ Payment list with search and filters  
✅ Payment detail view  
✅ Event timeline  
✅ Email logs  
✅ Resend payment links (via n8n webhook)  
✅ Sync from Monday.com  
✅ NeoPay URL decoding  

## Environment Variables Configured

- ✅ Supabase URL and keys
- ✅ Monday.com API token
- ⚠️ NeoPay credentials (placeholders - add if you have them)

## Next Steps

1. Run the database migration (see above)
2. Test the dashboard with seed data
3. If you have real payments in `neopay_payments`, you can:
   - View them in the dashboard
   - Sync their details from Monday.com
   - Resend payment links

## Troubleshooting

### "No payments found"

If you see this after loading:
- Check that the migration ran successfully
- Try loading the seed data for testing
- Check that `neopay_payments` table has data

### Monday.com sync fails

- Verify the Monday API token is correct
- Check that the board ID and column IDs in `lib/monday/config.ts` match your Monday board

### Resend doesn't work

- Ensure the payment has a `payment_url` in the details
- Check that the n8n webhook URL is correct
- Verify the n8n webhook is still active

## File Changes Summary

### New Files Created
- All files in `app/`, `components/`, `lib/`, `types/` directories
- Database migration and seed files
- Next.js configuration files
- Environment configuration

### Preserved Files
- `api/index.js` - Original working code (marked as deprecated but kept for reference)
- `package.json` - Updated with new dependencies

### Database
- ✅ `neopay_payments` table - **NOT TOUCHED**
- ✅ `settings` table - **NOT TOUCHED**
- ✅ Other tables (`clients`, `offers`, etc.) - **NOT TOUCHED**
- ➕ New tables added for payment control features

## Architecture

```
User Request
    ↓
Next.js Page (app/payments/*)
    ↓
API Route (app/api/*)
    ↓
Service Layer (lib/services/*)
    ↓
External APIs + Database
    ├── Supabase (payment data)
    ├── Monday.com (CRM data)
    ├── NeoPay (decode URLs)
    └── n8n (send emails)
```

## Important Notes

- The original `api/index.js` functionality has been fully preserved and enhanced
- All existing Monday.com column IDs are maintained
- The n8n webhook integration continues to work exactly as before
- The database migration is **safe** - it only adds new tables

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the terminal where `npm run dev` is running for server errors
3. Verify environment variables are set correctly in `.env.local`
4. Ensure the database migration completed successfully
