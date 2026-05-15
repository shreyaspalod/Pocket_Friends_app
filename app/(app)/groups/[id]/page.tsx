import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { GroupDetailClient } from './group-detail-client'
import type { Group, GroupMember, Profile, ExpenseWithSplits, ExpenseSplit, SettlementWithProfiles } from '@/lib/types'

type MemberRow = GroupMember & { profile: Profile }

interface Props {
  params: Promise<{ id: string }>
}

export default async function GroupPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) notFound()

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single()

  if (!group) notFound()

  // Members with profiles — cast because Supabase generic doesn't know relationships
  const { data: membersRaw } = await supabase
    .from('group_members')
    .select(`id, group_id, user_id, joined_at, profile:profiles!inner(id, name, created_at)`)
    .eq('group_id', id)
    .order('joined_at', { ascending: true })

  const members = (membersRaw ?? []) as unknown as MemberRow[]

  // Expenses with splits + profiles
  const { data: expensesRaw } = await supabase
    .from('expenses')
    .select(`
      id, group_id, paid_by, title, amount, expense_date, notes, is_recurring, recurrence_day, created_at,
      paid_by_profile:profiles!paid_by(id, name, created_at),
      splits:expense_splits(id, expense_id, user_id, amount, profile:profiles!user_id(id, name, created_at))
    `)
    .eq('group_id', id)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  const expenses = (expensesRaw ?? []) as unknown as ExpenseWithSplits[]

  // Settlements with profiles
  const { data: settlementsRaw } = await supabase
    .from('settlements')
    .select(`
      id, group_id, from_user, to_user, amount, note, created_at,
      from_profile:profiles!from_user(id, name, created_at),
      to_profile:profiles!to_user(id, name, created_at)
    `)
    .eq('group_id', id)
    .order('created_at', { ascending: false })

  const settlements = (settlementsRaw ?? []) as unknown as SettlementWithProfiles[]

  return (
    <GroupDetailClient
      group={group as unknown as Group}
      members={members}
      expenses={expenses}
      settlements={settlements}
      currentUserId={user.id}
    />
  )
}
