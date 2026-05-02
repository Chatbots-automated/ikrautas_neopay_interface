# ⚠️ CRITICAL: Run Database Migration First

## Why You're Seeing Errors

The error you're seeing is because the new database tables don't exist yet. The migration hasn't been run.

```
Error: Could not find a relationship between 'neopay_payments' and 'payment_request_details'
```

This is expected! The `payment_request_details` table needs to be created.

## Step 1: Run the Database Migration

### Option A: Automatic (Recommended)

Run this command in your terminal:

```bash
node scripts/run-migration.js
```

If that fails, use Option B below.

### Option B: Manual (Guaranteed to Work)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/eihrowcpckmabxcsyovd/sql/new
   - Or navigate to: Dashboard → SQL Editor → New Query

2. **Copy the Migration SQL**
   - Open the file: `supabase/migrations/001_payment_control_tables.sql`
   - Copy ALL the contents (252 lines)

3. **Paste and Run**
   - Paste the SQL into the Supabase SQL Editor
   - Click the "Run" button (or press Cmd/Ctrl + Enter)

4. **Verify Success**
   - You should see: "Success. No rows returned"
   - Check the Tables view - you should now see:
     - `payment_request_details` (NEW)
     - `payment_events` (NEW)
     - `payment_email_logs` (NEW)
     - `neopay_payments` (unchanged - existing)
     - `settings` (unchanged - existing)

## Step 2: Restart the Development Server

After the migration completes:

1. Stop the dev server (Ctrl+C in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

## Step 3: Load Sample Data (Optional)

If you want to test with sample data before using real payments:

1. Open Supabase SQL Editor again
2. Copy contents of: `supabase/seed.sql`
3. Paste and run
4. You'll now have 5 test payments to explore

## Step 4: Verify It's Working

1. Open: http://localhost:3000/payments
2. You should see either:
   - "Mokėjimų nerasta" (if no payments yet) - this is GOOD! It means the app is working
   - A list of payments (if you loaded seed data or have real payments)

## What This Migration Does

✅ Creates 3 new tables for payment management  
✅ Does NOT touch `neopay_payments` table  
✅ Does NOT touch `settings` table  
✅ Does NOT touch any other existing tables  
✅ Adds proper indexes for performance  
✅ Adds foreign key relationships  

## Still Having Issues?

If you still see errors after running the migration:

1. Check the Supabase dashboard to confirm the tables exist:
   - Go to: Database → Tables
   - Look for: `payment_request_details`, `payment_events`, `payment_email_logs`

2. Check the terminal where `npm run dev` is running for detailed error messages

3. Make sure `.env.local` has the correct Supabase credentials (already set)

## Next Steps After Migration

Once the migration is successful and the app loads:

1. **View existing payments** (if any exist in `neopay_payments` table)
2. **Sync from Monday.com** to populate client details
3. **Test resend functionality** with the n8n webhook
4. **Explore the event timeline and email logs**

---

## Quick Verification Checklist

- [ ] Migration SQL file exists: `supabase/migrations/001_payment_control_tables.sql`
- [ ] Supabase credentials are in `.env.local`
- [ ] Ran the migration in Supabase SQL Editor
- [ ] New tables appear in Supabase dashboard
- [ ] Dev server restarted
- [ ] http://localhost:3000/payments loads without 500 error
- [ ] Can see payments list (even if empty)

Once all checkboxes are checked, the system is ready to use! ✅
