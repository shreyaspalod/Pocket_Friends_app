'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/use-toast'
import { ArrowLeft, Equal, Percent, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Group, GroupMember, Profile } from '@/lib/types'

type MemberWithProfile = GroupMember & { profile: Profile }

// Keep Zod schema simple — no coerce, no number fields
const schema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  paid_by: z.string().min(1, 'Payer is required'),
  expense_date: z.string().min(1),
  notes: z.string().optional(),
  split_type: z.enum(['equal', 'custom']),
  is_recurring: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface Props {
  group: Group
  members: MemberWithProfile[]
  currentUserId: string
}

export function AddExpenseClient({ group, members, currentUserId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]

  // Manage numeric fields as local state to avoid zod coerce issues
  const [amountStr, setAmountStr] = useState('')
  const [recurrenceDayStr, setRecurrenceDayStr] = useState('')
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal')
  const [isRecurring, setIsRecurring] = useState(false)
  const [customSplits, setCustomSplits] = useState<Record<string, string>>(
    Object.fromEntries(members.map((m) => [m.user_id, '']))
  )
  const [paidBy, setPaidBy] = useState(currentUserId)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      paid_by: currentUserId,
      expense_date: today,
      notes: '',
      split_type: 'equal',
      is_recurring: false,
    },
  })

  const amount = parseFloat(amountStr) || 0
  const equalSplitAmount = amount > 0 && members.length > 0
    ? Math.floor((amount / members.length) * 100) / 100
    : 0
  const equalSplitRemainder = amount > 0
    ? Math.round((amount - equalSplitAmount * members.length) * 100) / 100
    : 0

  const customTotal = Object.values(customSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const customRemaining = amount > 0 ? Math.round((amount - customTotal) * 100) / 100 : 0

  function distributeEqually() {
    const per = Math.floor((amount / members.length) * 100) / 100
    const remainder = Math.round((amount - per * members.length) * 100) / 100
    const next: Record<string, string> = {}
    members.forEach((m, i) => {
      next[m.user_id] = (i === 0 ? per + remainder : per).toFixed(2)
    })
    setCustomSplits(next)
  }

  async function onSubmit(data: FormData) {
    const parsedAmount = parseFloat(amountStr)
    if (!parsedAmount || parsedAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Enter a positive amount.' })
      return
    }

    let splits: { user_id: string; amount: number }[] = []

    if (splitType === 'equal') {
      const per = Math.floor((parsedAmount / members.length) * 100) / 100
      const remainder = Math.round((parsedAmount - per * members.length) * 100) / 100
      splits = members.map((m, i) => ({ user_id: m.user_id, amount: i === 0 ? per + remainder : per }))
    } else {
      splits = members
        .map((m) => ({ user_id: m.user_id, amount: parseFloat(customSplits[m.user_id] || '0') }))
        .filter((s) => s.amount > 0)

      const total = splits.reduce((s, sp) => s + sp.amount, 0)
      if (Math.abs(total - parsedAmount) > 0.01) {
        toast({
          variant: 'destructive',
          title: "Splits don't add up",
          description: `Total splits (${formatCurrency(total)}) must equal the expense amount (${formatCurrency(parsedAmount)}).`,
        })
        return
      }
    }

    try {
      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          group_id: group.id,
          paid_by: data.paid_by,
          title: data.title.trim(),
          amount: parsedAmount,
          expense_date: data.expense_date,
          notes: data.notes?.trim() || null,
          is_recurring: isRecurring,
          recurrence_day: isRecurring && recurrenceDayStr ? parseInt(recurrenceDayStr) : null,
        })
        .select()
        .single()

      if (error) throw error

      const { error: splitError } = await supabase
        .from('expense_splits')
        .insert(splits.map((s) => ({ expense_id: expense.id, user_id: s.user_id, amount: s.amount })))

      if (splitError) throw splitError

      toast({ variant: 'success', title: 'Expense added!', description: `"${data.title}" (${formatCurrency(parsedAmount)}) added.` })
      router.push(`/groups/${group.id}`)
      router.refresh()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Could not add expense.' })
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href={`/groups/${group.id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add expense</h1>
          <p className="text-sm text-gray-500">{group.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic info */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Expense details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">What was it for? *</Label>
              <Input id="title" placeholder="Groceries, Electricity bill…" {...register('title')} autoFocus />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...register('expense_date')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Paid by</Label>
              <Select
                value={paidBy}
                onValueChange={(v) => { setPaidBy(v); setValue('paid_by', v) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payer" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profile.name}{m.user_id === currentUserId ? ' (you)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" placeholder="Any details…" rows={2} {...register('notes')} />
            </div>
          </CardContent>
        </Card>

        {/* Split */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">How to split</CardTitle>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => { setSplitType('equal'); setValue('split_type', 'equal') }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${splitType === 'equal' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <Equal className="w-3 h-3" /> Equal
                </button>
                <button
                  type="button"
                  onClick={() => { setSplitType('custom'); setValue('split_type', 'custom') }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${splitType === 'custom' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <Percent className="w-3 h-3" /> Custom
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {splitType === 'equal' ? (
              <div className="space-y-2">
                {members.map((m, i) => (
                  <div key={m.user_id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">
                        {m.profile.name[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{m.profile.name}</span>
                      {m.user_id === currentUserId && <Badge variant="secondary" className="text-xs">you</Badge>}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {amount > 0 ? formatCurrency(i === 0 ? equalSplitAmount + equalSplitRemainder : equalSplitAmount) : '₹0.00'}
                    </span>
                  </div>
                ))}
                {amount > 0 && (
                  <p className="text-xs text-gray-400 text-right">
                    {formatCurrency(amount)} ÷ {members.length} members
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Enter each person&apos;s share</p>
                  <button
                    type="button"
                    onClick={distributeEqually}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    Distribute equally
                  </button>
                </div>
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs shrink-0">
                        {m.profile.name[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate">{m.profile.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm text-gray-500">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={customSplits[m.user_id]}
                        onChange={(e) => setCustomSplits((prev) => ({ ...prev, [m.user_id]: e.target.value }))}
                        className="w-28 text-right"
                      />
                    </div>
                  </div>
                ))}
                <div className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm font-medium mt-2 ${Math.abs(customRemaining) < 0.01 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  <span>{Math.abs(customRemaining) < 0.01 ? 'Splits balanced!' : 'Remaining to assign:'}</span>
                  {Math.abs(customRemaining) >= 0.01 && <span>{formatCurrency(customRemaining)}</span>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recurring */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-gray-500" />
                <Label className="cursor-pointer">Recurring expense</Label>
              </div>
              <button
                type="button"
                onClick={() => { setIsRecurring((v) => !v); setValue('is_recurring', !isRecurring) }}
                className={`relative w-10 h-5 rounded-full transition-colors ${isRecurring ? 'bg-green-600' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isRecurring ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {isRecurring && (
              <div className="mt-3 space-y-1.5">
                <Label>Day of month (1–28)</Label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  placeholder="1"
                  value={recurrenceDayStr}
                  onChange={(e) => setRecurrenceDayStr(e.target.value)}
                  className="w-24"
                />
                <p className="text-xs text-gray-500">Auto-generates on this day every month</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 pb-6">
          <Link href={`/groups/${group.id}`} className="flex-1">
            <Button type="button" variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add expense'}
          </Button>
        </div>
      </form>
    </div>
  )
}
