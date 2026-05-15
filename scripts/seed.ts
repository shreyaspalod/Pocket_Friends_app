/**
 * Seed script — creates demo users + a demo group with expenses.
 * Run with: npx tsx scripts/seed.ts
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://caivdtzwlsjlghplzhao.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhaXZkdHp3bHNqbGdocGx6aGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc0MzIxNSwiZXhwIjoyMDk0MzE5MjE1fQ.YHXF43bKpWcGb2i1ol18WpNeFsbR03vrSs8urUPAsmQ'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_USERS = [
  { name: 'Shreyas', email: 'shreyas@demo.com', password: 'demo1234' },
  { name: 'Akash',   email: 'akash@demo.com',   password: 'demo1234' },
  { name: 'Kritika', email: 'kritika@demo.com',  password: 'demo1234' },
]

async function createOrGetUser(email: string, password: string, name: string) {
  // Try to create the user
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (createErr && !createErr.message.includes('already been registered')) {
    throw createErr
  }

  if (created?.user) {
    // Upsert profile
    await supabase.from('profiles').upsert({ id: created.user.id, name }, { onConflict: 'id' })
    return created.user.id
  }

  // User already exists — fetch by email
  const { data: list } = await supabase.auth.admin.listUsers()
  const existing = list?.users.find((u) => u.email === email)
  if (!existing) throw new Error(`Could not find user ${email}`)
  await supabase.from('profiles').upsert({ id: existing.id, name }, { onConflict: 'id' })
  return existing.id
}

async function main() {
  console.log('🌱 Seeding demo data…')

  const ids: Record<string, string> = {}
  for (const u of DEMO_USERS) {
    const id = await createOrGetUser(u.email, u.password, u.name)
    ids[u.name] = id
    console.log(`  ✓ ${u.name} (${u.email}) → ${id}`)
  }

  // Create demo group
  const { data: existingGroup } = await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', 'DEMO0001')
    .single()

  let groupId: string

  if (existingGroup) {
    groupId = existingGroup.id
    console.log(`  ✓ Demo group already exists → ${groupId}`)
  } else {
    const { data: group, error: gErr } = await supabase
      .from('groups')
      .insert({
        name: 'The Flat',
        description: 'Demo group — Koramangala roommates',
        invite_code: 'DEMO0001',
        created_by: ids['Shreyas'],
      })
      .select()
      .single()

    if (gErr) throw gErr
    groupId = group.id
    console.log(`  ✓ Created group "The Flat" → ${groupId}`)
  }

  // Add members
  for (const name of Object.keys(ids)) {
    await supabase
      .from('group_members')
      .upsert({ group_id: groupId, user_id: ids[name] }, { onConflict: 'group_id,user_id' })
  }
  console.log('  ✓ Added all members')

  // Seed expenses (only if none exist)
  const { data: existingExpenses } = await supabase
    .from('expenses')
    .select('id')
    .eq('group_id', groupId)
    .limit(1)

  if ((existingExpenses ?? []).length > 0) {
    console.log('  ↩ Expenses already seeded, skipping')
  } else {
    const expenseDefs = [
      { title: 'Monthly Rent',    amount: 45000, paid_by: 'Shreyas', date: '2025-05-01', splits: { Shreyas: 15000, Akash: 15000, Kritika: 15000 } },
      { title: 'Electricity Bill', amount: 3600,  paid_by: 'Akash',   date: '2025-05-03', splits: { Shreyas: 1200,  Akash: 1200,  Kritika: 1200  } },
      { title: 'Groceries',        amount: 2400,  paid_by: 'Kritika', date: '2025-05-05', splits: { Shreyas: 800,   Akash: 800,   Kritika: 800   } },
      { title: 'Internet Bill',    amount: 1200,  paid_by: 'Shreyas', date: '2025-05-07', splits: { Shreyas: 400,   Akash: 400,   Kritika: 400   } },
      { title: 'Dining Out',       amount: 1800,  paid_by: 'Akash',   date: '2025-05-10', splits: { Shreyas: 400,   Akash: 1000,  Kritika: 400   } },
    ]

    for (const def of expenseDefs) {
      const { data: exp, error: eErr } = await supabase
        .from('expenses')
        .insert({
          group_id: groupId,
          paid_by: ids[def.paid_by],
          title: def.title,
          amount: def.amount,
          expense_date: def.date,
        })
        .select()
        .single()

      if (eErr) throw eErr

      const splits = Object.entries(def.splits).map(([name, amount]) => ({
        expense_id: exp.id,
        user_id: ids[name],
        amount,
      }))

      const { error: sErr } = await supabase.from('expense_splits').insert(splits)
      if (sErr) throw sErr
      console.log(`  ✓ Expense: "${def.title}" (₹${def.amount})`)
    }
  }

  console.log('\n✅ Seed complete!')
  console.log('\nDemo login credentials:')
  for (const u of DEMO_USERS) {
    console.log(`  ${u.name.padEnd(10)} ${u.email.padEnd(22)} / ${u.password}`)
  }
  console.log(`\nDemo group invite code: DEMO0001`)
}

main().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
