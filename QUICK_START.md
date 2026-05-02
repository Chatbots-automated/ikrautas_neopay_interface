# ⚡ Quick Start Guide

## 🚨 STEP 1: Run Database Migration (REQUIRED)

**Why?** The app is showing errors because new tables don't exist yet.

### Do This Now:

1. Open: https://supabase.com/dashboard/project/eihrowcpckmabxcsyovd/sql/new

2. Copy ALL contents of: `supabase/migrations/001_payment_control_tables.sql`

3. Paste into Supabase SQL Editor and click "Run"

4. You should see: "Success. No rows returned"

✅ Done! The 3 new tables are now created.

---

## 🚀 STEP 2: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Start again:
npm run dev
```

---

## ✨ STEP 3: Open the Dashboard

Go to: http://localhost:3000/payments

You should now see:
- Either "Mokėjimų nerasta" (good! means it's working)
- Or a list of payments if you have data

---

## 🎯 STEP 4: Test the Features

### If You Have Existing Payments:
1. They should appear in the list
2. Click any payment to see details
3. Click "Sinchronizuoti iš Monday" to pull client data
4. Click "Išsiųsti iš naujo" to resend payment link

### If You Want Test Data:
1. Open Supabase SQL Editor again
2. Copy ALL contents of: `supabase/seed.sql`
3. Paste and run
4. Refresh the payments page
5. You'll now see 5 sample payments

---

## 📱 What You Can Do Now

✅ **Search payments** - By name, email, phone, IDs  
✅ **Filter payments** - By type (advance/final) and status  
✅ **View details** - Full payment info with timeline  
✅ **Resend links** - Via n8n webhook  
✅ **Sync Monday** - Pull latest client data  
✅ **Track history** - See all events and emails  

---

## ❓ Still Seeing Errors?

### Error: "Could not find relationship..."
→ You need to run the migration (Step 1 above)

### Error: "MONDAY_API_TOKEN is not set"
→ Already set in `.env.local`, just restart server

### Error: "Payment not found"
→ Normal if `neopay_payments` table is empty. Add seed data or wait for real payments.

---

## 🎓 Learn More

- **Full Setup**: `SETUP_INSTRUCTIONS.md`
- **Architecture**: `DEVELOPMENT_PLAN.md`
- **All Features**: `README.md`
- **Summary**: `PROJECT_SUMMARY.md`

---

## ✅ Checklist

- [ ] Ran migration SQL in Supabase
- [ ] Restarted dev server
- [ ] Opened http://localhost:3000/payments
- [ ] Page loads without 500 error
- [ ] Can see payment list (even if empty)

**All done? Start managing payments! 🎉**
