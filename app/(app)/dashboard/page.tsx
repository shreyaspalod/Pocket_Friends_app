import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './dashboard-client'
import type { Group } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, groups(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const groupList: Group[] = (memberships ?? [])
    .map((gm) => gm.groups as unknown as Group)
    .filter(Boolean)

  return <DashboardClient groups={groupList} userId={user.id} />
}
