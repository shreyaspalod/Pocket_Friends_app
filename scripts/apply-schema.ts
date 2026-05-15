/**
 * Applies the database schema to Supabase using the Management API.
 * Run with: npx tsx scripts/apply-schema.ts
 *
 * Requires SUPABASE_ACCESS_TOKEN env var (personal access token from
 * https://supabase.com/dashboard/account/tokens)
 */

import * as fs from 'fs'
import * as path from 'path'

const PROJECT_REF = 'caivdtzwlsjlghplzhao'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

async function main() {
  if (!ACCESS_TOKEN) {
    console.error('\n❌ SUPABASE_ACCESS_TOKEN not set.')
    console.error('Get your token from: https://supabase.com/dashboard/account/tokens')
    console.error('Then run: SUPABASE_ACCESS_TOKEN=your_token npx tsx scripts/apply-schema.ts\n')

    console.log('\nAlternative: Paste the following SQL in the Supabase SQL Editor:')
    console.log('https://supabase.com/dashboard/project/caivdtzwlsjlghplzhao/editor\n')
    const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/001_initial.sql'), 'utf8')
    console.log(sql)
    process.exit(1)
  }

  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/001_initial.sql'), 'utf8')

  console.log('📦 Applying schema to Supabase…')

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('❌ Failed:', JSON.stringify(data, null, 2))
    process.exit(1)
  }

  console.log('✅ Schema applied successfully!')
  console.log('Now run: npm run seed')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
