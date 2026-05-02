#!/usr/bin/env node

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = 'https://eihrowcpckmabxcsyovd.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpaHJvd2NwY2ttYWJ4Y3N5b3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2ODEzNywiZXhwIjoyMDYzMjQ0MTM3fQ.8QlzTHizgxJu6TDnZ-e-rd7K2ehu0j9VXkIvkShPZW4'

async function runMigration() {
  console.log('🔄 Running database migration...\n')

  try {
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '001_payment_control_tables.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration file loaded')
    console.log('🌐 Connecting to Supabase...\n')

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql: migrationSQL })
    })

    if (response.ok) {
      console.log('✅ Migration completed successfully!')
      console.log('\nNew tables created:')
      console.log('  • payment_request_details')
      console.log('  • payment_events')
      console.log('  • payment_email_logs')
      console.log('\n✅ Existing tables preserved:')
      console.log('  • neopay_payments (NOT TOUCHED)')
      console.log('  • settings (NOT TOUCHED)')
    } else {
      const errorText = await response.text()
      console.error('❌ Migration failed:', response.status, errorText)
      
      console.log('\n📝 Manual migration instructions:')
      console.log('1. Go to: https://supabase.com/dashboard/project/eihrowcpckmabxcsyovd/sql')
      console.log('2. Click "New Query"')
      console.log('3. Copy contents of: supabase/migrations/001_payment_control_tables.sql')
      console.log('4. Paste and click "Run"')
    }
  } catch (error) {
    console.error('❌ Error running migration:', error.message)
    
    console.log('\n📝 Manual migration instructions:')
    console.log('1. Go to: https://supabase.com/dashboard/project/eihrowcpckmabxcsyovd/sql')
    console.log('2. Click "New Query"')
    console.log('3. Copy contents of: supabase/migrations/001_payment_control_tables.sql')
    console.log('4. Paste and click "Run"')
  }
}

runMigration()
