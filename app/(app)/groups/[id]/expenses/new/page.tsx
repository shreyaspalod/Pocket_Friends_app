import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AddExpenseClient } from './add-expense-client'
import type { Group, GroupMember, Profile } from '@/lib/types'

type MemberWithProfile = GroupMember & { profile: Profile }

interface Props {
  params: Promise<{ id: string }>
}

export default async function NewExpensePage({ params }: Props) {
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

  const { data: group } = await supabase.from('groups').select('*').eq('id', id).single()
  if (!group) notFound()

  const { data: membersRaw } = await supabase
    .from('group_members')
    .select(`id, group_id, user_id, joined_at, profile:profiles!inner(id, name, created_at)`)
    .eq('group_id', id)
    .order('joined_at', { ascending: true })

  const members = (membersRaw ?? []) as unknown as MemberWithProfile[]

  return (
    <AddExpenseClient
      group={group as unknown as Group}
      members={members}
      currentUserId={user.id}
    />
  )
}
