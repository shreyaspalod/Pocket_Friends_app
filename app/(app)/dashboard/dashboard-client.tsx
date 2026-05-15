'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/lib/use-toast'
import { Plus, Users, ArrowRight, Hash, Copy, Check } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Group } from '@/lib/types'

interface Props {
  groups: Group[]
  userId: string
}

export function DashboardClient({ groups: initialGroups, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [groups, setGroups] = useState(initialGroups)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!groupName.trim()) return
    setCreating(true)
    try {
      const { data: group, error } = await supabase
        .from('groups')
        .insert({ name: groupName.trim(), description: groupDesc.trim() || null, created_by: userId })
        .select()
        .single()

      if (error) throw error

      // Add creator as member
      await supabase.from('group_members').insert({ group_id: group.id, user_id: userId })

      setGroups((prev) => [group, ...prev])
      setShowCreate(false)
      setGroupName('')
      setGroupDesc('')
      toast({ variant: 'success', title: 'Group created!', description: `"${group.name}" is ready.` })
      router.push(`/groups/${group.id}`)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Could not create group.' })
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const code = inviteCode.trim().toUpperCase()
    if (!code) return
    setJoining(true)
    try {
      const { data: group, error } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', code)
        .single()

      if (error || !group) throw new Error('Group not found. Check the invite code.')

      // Check if already a member
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', userId)
        .single()

      if (existing) {
        toast({ title: 'Already a member', description: `You're already in "${group.name}".` })
        router.push(`/groups/${group.id}`)
        return
      }

      await supabase.from('group_members').insert({ group_id: group.id, user_id: userId })
      setGroups((prev) => [group, ...prev])
      setShowJoin(false)
      setInviteCode('')
      toast({ variant: 'success', title: 'Joined!', description: `Welcome to "${group.name}".` })
      router.push(`/groups/${group.id}`)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not join', description: err instanceof Error ? err.message : 'Invalid code.' })
    } finally {
      setJoining(false)
    }
  }

  async function copyInviteCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Groups</h1>
          <p className="text-sm text-gray-500 mt-0.5">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowJoin(true)}>
            <Hash className="w-4 h-4" />
            Join
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create
          </Button>
        </div>
      </div>

      {/* Groups list */}
      {groups.length === 0 ? (
        <Card className="border-dashed border-gray-200 bg-white/60">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <Users className="w-7 h-7 text-green-500" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">No groups yet</p>
              <p className="text-sm text-gray-500 mt-1">Create one or join with an invite code</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowJoin(true)}>
                <Hash className="w-4 h-4" /> Join group
              </Button>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> Create group
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="hover:shadow-md hover:border-green-200 transition-all cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg shrink-0">
                    {group.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{group.name}</p>
                    {group.description && (
                      <p className="text-sm text-gray-500 truncate">{group.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-400">Created {formatDate(group.created_at)}</p>
                      <button
                        onClick={(e) => { e.preventDefault(); copyInviteCode(group.invite_code) }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-600 transition-colors"
                      >
                        {copiedCode === group.invite_code ? (
                          <><Check className="w-3 h-3" /> Copied</>
                        ) : (
                          <><Copy className="w-3 h-3" /> {group.invite_code}</>
                        )}
                      </button>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create group dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a group</DialogTitle>
            <DialogDescription>Give your group a name — e.g. "The Flat" or "Goa Trip"</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="gname">Group name *</Label>
              <Input id="gname" placeholder="The Flat" value={groupName} onChange={(e) => setGroupName(e.target.value)} maxLength={60} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gdesc">Description (optional)</Label>
              <Input id="gdesc" placeholder="Roommates at Koramangala" value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} maxLength={120} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={!groupName.trim() || creating}>
                {creating ? 'Creating…' : 'Create group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join group dialog */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a group</DialogTitle>
            <DialogDescription>Enter the 8-character invite code shared by a group member.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Invite code</Label>
              <Input
                id="code"
                placeholder="e.g. A3F9B2C1"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="font-mono tracking-widest text-center text-lg"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowJoin(false)}>Cancel</Button>
              <Button type="submit" disabled={inviteCode.trim().length < 6 || joining}>
                {joining ? 'Joining…' : 'Join group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
