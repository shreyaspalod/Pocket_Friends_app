import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const DEMO_USERS = [
    { name: 'Shreyas', email: 'shreyas@demo.com', password: 'demo1234' },
    { name: 'Akash',   email: 'akash@demo.com',   password: 'demo1234' },
    { name: 'Kritika', email: 'kritika@demo.com',  password: 'demo1234' },
  ]

  try {
    const ids: Record<string, string> = {}

    for (const u of DEMO_USERS) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name },
      })

      if (createErr && !createErr.message.includes('already been registered')) {
        throw createErr
      }

      if (created?.user) {
        await supabase.from('profiles').upsert({ id: created.user.id, name: u.name }, { onConflict: 'id' })
        ids[u.name] = created.user.id
      } else {
        const { data: list } = await supabase.auth.admin.listUsers()
        const existing = list?.users.find((usr) => usr.email === u.email)
        if (!existing) throw new Error(`Could not find user ${u.email}`)
        await supabase.from('profiles').upsert({ id: existing.id, name: u.name }, { onConflict: 'id' })
        ids[u.name] = existing.id
      }
    }

    // Create or get demo group
    let groupId: string
    const { data: existingGroup } = await supabase
      .from('groups')
      .select('id')
      .eq('invite_code', 'DEMO0001')
      .single()

    if (existingGroup) {
      groupId = existingGroup.id
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
    }

    // Add members
    for (const name of Object.keys(ids)) {
      await supabase
        .from('group_members')
        .upsert({ group_id: groupId, user_id: ids[name] }, { onConflict: 'group_id,user_id' })
    }

    // Seed expenses
    const { data: existingExpenses } = await supabase
      .from('expenses')
      .select('id')
      .eq('group_id', groupId)
      .limit(1)

    if ((existingExpenses ?? []).length === 0) {
      const expenseDefs = [
        { title: 'Monthly Rent',     amount: 45000, paid_by: 'Shreyas', date: '2025-05-01', splits: { Shreyas: 15000, Akash: 15000, Kritika: 15000 } },
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

        await supabase.from('expense_splits').insert(
          Object.entries(def.splits).map(([name, amount]) => ({
            expense_id: exp.id,
            user_id: ids[name],
            amount,
          }))
        )
      }
    }

    return NextResponse.json({ success: true, message: 'Demo data seeded!', groupId, ids })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Seed failed' },
      { status: 500 }
    )
  }
}
