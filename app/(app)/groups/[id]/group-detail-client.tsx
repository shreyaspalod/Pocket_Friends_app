'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/lib/use-toast'
import { computeBalances, minimizeTransactions } from '@/lib/netting'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import {
  Plus, ArrowLeft, Copy, Check, Users, Receipt,
  Scale, ArrowRight, TrendingUp, TrendingDown, Minus,
  Download, RefreshCw,
} from 'lucide-react'
import type { Group, GroupMember, Profile, SettlementWithProfiles } from '@/lib/types'

type MemberWithProfile = GroupMember & { profile: Profile }
type ExpenseWithSplits = {
  id: string; group_id: string; paid_by: string | null; title: string
  amount: number; expense_date: string; notes: string | null
  is_recurring: boolean; recurrence_day: number | null; created_at: string
  paid_by_profile: Profile | null
  splits: { id: string; expense_id: string; user_id: string; amount: number; profile: Profile }[]
}

interface Props {
  group: Group
  members: MemberWithProfile[]
  expenses: ExpenseWithSplits[]
  settlements: SettlementWithProfiles[]
  currentUserId: string
}

export function GroupDetailClient({ group, members, expenses, settlements, currentUserId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [copied, setCopied] = useState(false)
  const [settlementDialog, setSettlementDialog] = useState<{ from: string; to: string; fromName: string; toName: string; amount: number } | null>(null)
  const [settling, setSettling] = useState(false)

  const memberMap = Object.fromEntries(members.map((m) => [m.user_id, m.profile]))

  // Compute balances
  const balanceInput = members.map((m) => ({ userId: m.user_id, name: m.profile.name }))
  const expenseInput = expenses.map((e) => ({
    paid_by: e.paid_by,
    splits: e.splits.map((s) => ({ user_id: s.user_id, amount: s.amount })),
  }))
  const settlementInput = settlements.map((s) => ({
    from_user: s.from_user,
    to_user: s.to_user,
    amount: s.amount,
  }))

  const balances = computeBalances(balanceInput, expenseInput, settlementInput)
  const suggestions = minimizeTransactions(balances)

  const myBalance = balances.find((b) => b.userId === currentUserId)

  async function copyInvite() {
    await navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSettle() {
    if (!settlementDialog) return
    setSettling(true)
    try {
      const { error } = await supabase.from('settlements').insert({
        group_id: group.id,
        from_user: settlementDialog.from,
        to_user: settlementDialog.to,
        amount: settlementDialog.amount,
        note: `${settlementDialog.fromName} settled up with ${settlementDialog.toName}`,
      })
      if (error) throw error
      toast({ variant: 'success', title: 'Settled up!', description: `${settlementDialog.fromName} paid ${settlementDialog.toName} ${formatCurrency(settlementDialog.amount)}.` })
      setSettlementDialog(null)
      router.refresh()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Could not record settlement.' })
    } finally {
      setSettling(false)
    }
  }

  function exportCSV() {
    const rows = [
      ['Date', 'Title', 'Paid By', 'Total Amount', 'Your Share', 'Notes'],
      ...expenses.map((e) => {
        const myShare = e.splits.find((s) => s.user_id === currentUserId)?.amount ?? 0
        return [
          e.expense_date,
          e.title,
          e.paid_by_profile?.name ?? 'Unknown',
          e.amount.toFixed(2),
          myShare.toFixed(2),
          e.notes ?? '',
        ]
      }),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${group.name.replace(/\s+/g, '_')}_expenses.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Exported!', description: 'CSV downloaded.' })
  }

  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0)
  const myTotalSpend = expenses.reduce((s, e) => {
    const split = e.splits.find((sp) => sp.user_id === currentUserId)
    return s + (split?.amount ?? 0)
  }, 0)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{group.name}</h1>
          {group.description && <p className="text-sm text-gray-500 truncate">{group.description}</p>}
        </div>
        <button onClick={copyInvite} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-600 transition-colors bg-gray-50 hover:bg-green-50 px-3 py-1.5 rounded-lg border border-gray-200">
          {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> {group.invite_code}</>}
        </button>
      </div>

      {/* My balance summary */}
      {myBalance && (
        <Card className={`border ${myBalance.net > 0.01 ? 'border-green-200 bg-green-50' : myBalance.net < -0.01 ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-white'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Your balance</p>
              <p className={`text-2xl font-bold mt-0.5 ${myBalance.net > 0.01 ? 'text-green-700' : myBalance.net < -0.01 ? 'text-red-600' : 'text-gray-700'}`}>
                {myBalance.net > 0.01 ? '+' : ''}{formatCurrency(myBalance.net)}
              </p>
            </div>
            {myBalance.net > 0.01 ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-100 rounded-lg px-3 py-1.5">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">You are owed</span>
              </div>
            ) : myBalance.net < -0.01 ? (
              <div className="flex items-center gap-2 text-red-600 bg-red-100 rounded-lg px-3 py-1.5">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-medium">You owe</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5">
                <Minus className="w-4 h-4" />
                <span className="text-sm font-medium">All settled</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add expense CTA */}
      <Link href={`/groups/${group.id}/expenses/new`}>
        <Button className="w-full">
          <Plus className="w-4 h-4" />
          Add expense
        </Button>
      </Link>

      {/* Tabs */}
      <Tabs defaultValue="balances">
        <TabsList className="w-full">
          <TabsTrigger value="balances" className="flex-1">
            <Scale className="w-3.5 h-3.5 mr-1.5" />
            Balances
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1">
            <Receipt className="w-3.5 h-3.5 mr-1.5" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="members" className="flex-1">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Members
          </TabsTrigger>
        </TabsList>

        {/* BALANCES TAB */}
        <TabsContent value="balances" className="space-y-4 mt-4">
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <p className="font-semibold text-gray-800">All settled up!</p>
                <p className="text-sm text-gray-500">No outstanding balances in this group.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {suggestions.length} transaction{suggestions.length !== 1 ? 's' : ''} to settle everything
              </p>
              {suggestions.map((s, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarFallback className="text-xs">{getInitials(s.from.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        <span className="text-gray-700">{s.from.name}</span>
                        <ArrowRight className="inline w-3 h-3 mx-1 text-gray-400" />
                        <span className="text-gray-700">{s.to.name}</span>
                      </p>
                      <p className="text-lg font-bold text-green-700">{formatCurrency(s.amount)}</p>
                    </div>
                    {(s.from.id === currentUserId || s.to.id === currentUserId) && (
                      <Button
                        size="sm"
                        variant={s.from.id === currentUserId ? 'default' : 'outline'}
                        onClick={() => setSettlementDialog({
                          from: s.from.id, to: s.to.id,
                          fromName: s.from.name, toName: s.to.name,
                          amount: s.amount,
                        })}
                      >
                        Settle up
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* All member balances */}
              <Separator />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Member balances</p>
              {balances.map((b) => (
                <div key={b.userId} className="flex items-center gap-3 py-1">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="text-xs">{getInitials(b.name)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm text-gray-700 font-medium">{b.name}</span>
                  <span className={`text-sm font-semibold ${b.net > 0.01 ? 'text-green-700' : b.net < -0.01 ? 'text-red-600' : 'text-gray-400'}`}>
                    {b.net > 0.01 ? '+' : ''}{formatCurrency(b.net)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* EXPENSES TAB */}
        <TabsContent value="expenses" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total spent: <span className="font-semibold text-gray-900">{formatCurrency(totalSpend)}</span></p>
              <p className="text-sm text-gray-500">Your share: <span className="font-semibold text-gray-900">{formatCurrency(myTotalSpend)}</span></p>
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
          </div>

          {expenses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
                <Receipt className="w-8 h-8 text-gray-300" />
                <p className="text-sm text-gray-500">No expenses yet. Add the first one!</p>
                <Link href={`/groups/${group.id}/expenses/new`}>
                  <Button size="sm"><Plus className="w-4 h-4" /> Add expense</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => {
                const myShare = expense.splits.find((s) => s.user_id === currentUserId)?.amount ?? 0
                const iPaid = expense.paid_by === currentUserId
                return (
                  <Card key={expense.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Receipt className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-gray-900 truncate">{expense.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {expense.paid_by_profile?.name ?? 'Unknown'} paid · {formatDate(expense.expense_date)}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
                              {myShare > 0 && (
                                <p className={`text-xs font-medium ${iPaid ? 'text-green-600' : 'text-gray-500'}`}>
                                  {iPaid ? `you get back ${formatCurrency(expense.amount - myShare)}` : `your share: ${formatCurrency(myShare)}`}
                                </p>
                              )}
                            </div>
                          </div>
                          {expense.notes && (
                            <p className="text-xs text-gray-400 mt-1">{expense.notes}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {expense.splits.map((split) => (
                              <Badge key={split.user_id} variant="secondary" className="text-xs">
                                {split.profile.name}: {formatCurrency(split.amount)}
                              </Badge>
                            ))}
                            {expense.is_recurring && (
                              <Badge variant="warning" className="text-xs">
                                <RefreshCw className="w-2.5 h-2.5 mr-1" />
                                Recurring
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ACTIVITY TAB */}
        <TabsContent value="activity" className="space-y-3 mt-4">
          {settlements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 gap-2">
                <RefreshCw className="w-8 h-8 text-gray-300" />
                <p className="text-sm text-gray-500">No settlements yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{settlements.length} settlement{settlements.length !== 1 ? 's' : ''}</p>
              {settlements.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {s.from_profile?.name ?? 'Unknown'} paid {s.to_profile?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(s.created_at)}</p>
                    </div>
                    <p className="font-bold text-blue-700 shrink-0">{formatCurrency(s.amount)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* MEMBERS TAB */}
        <TabsContent value="members" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            <button onClick={copyInvite} className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium">
              {copied ? <><Check className="w-3 h-3" /> Copied invite code</> : <><Copy className="w-3 h-3" /> Copy invite code</>}
            </button>
          </div>
          <div className="space-y-2">
            {members.map((member) => {
              const bal = balances.find((b) => b.userId === member.user_id)
              return (
                <Card key={member.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback>{getInitials(member.profile.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{member.profile.name}</p>
                      <p className="text-xs text-gray-500">Joined {formatDate(member.joined_at)}</p>
                    </div>
                    {bal && (
                      <span className={`text-sm font-semibold shrink-0 ${bal.net > 0.01 ? 'text-green-700' : bal.net < -0.01 ? 'text-red-600' : 'text-gray-400'}`}>
                        {bal.net > 0.01 ? '+' : ''}{formatCurrency(bal.net)}
                      </span>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100 mt-4">
            <p className="text-sm text-green-800 font-medium">Invite someone</p>
            <p className="text-xs text-green-700 mt-1">Share invite code <span className="font-mono font-bold">{group.invite_code}</span> and they can join from the dashboard.</p>
            <Button size="sm" variant="outline" className="mt-3 border-green-200 text-green-700 hover:bg-green-100" onClick={copyInvite}>
              {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy code</>}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Settle up confirmation dialog */}
      <Dialog open={!!settlementDialog} onOpenChange={(open) => !open && setSettlementDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm settlement</DialogTitle>
            <DialogDescription>
              This will record a payment and update balances for everyone.
            </DialogDescription>
          </DialogHeader>
          {settlementDialog && (
            <div className="py-4">
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                <Avatar><AvatarFallback>{getInitials(settlementDialog.fromName)}</AvatarFallback></Avatar>
                <div className="flex-1 text-center">
                  <ArrowRight className="w-5 h-5 text-gray-400 mx-auto" />
                </div>
                <Avatar><AvatarFallback>{getInitials(settlementDialog.toName)}</AvatarFallback></Avatar>
              </div>
              <p className="text-center mt-4 text-gray-700">
                <span className="font-semibold">{settlementDialog.fromName}</span> pays{' '}
                <span className="font-semibold">{settlementDialog.toName}</span>
              </p>
              <p className="text-center text-3xl font-bold text-green-700 mt-1">
                {formatCurrency(settlementDialog.amount)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettlementDialog(null)}>Cancel</Button>
            <Button onClick={handleSettle} disabled={settling}>
              {settling ? 'Recording…' : 'Confirm settlement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
