import type { MemberBalance, SettlementSuggestion } from './types'

/**
 * Given net balances (positive = owed to them, negative = they owe),
 * returns the minimum number of transactions to settle all debts.
 *
 * Algorithm: greedy matching of largest creditor with largest debtor.
 * Example: A→B 50, B→C 30 → nets to A owes 50, B owes -20, C owed 30
 * → A pays C 30, A pays B 20  (2 transactions, not 3)
 */
export function minimizeTransactions(
  balances: MemberBalance[]
): SettlementSuggestion[] {
  // Deep clone to avoid mutating the input
  const creditors: MemberBalance[] = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net)

  const debtors: MemberBalance[] = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.net - b.net)

  const transactions: SettlementSuggestion[] = []

  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const debtAmt = Math.abs(debtors[i].net)
    const creditAmt = creditors[j].net
    const settled = Math.min(debtAmt, creditAmt)
    const roundedSettled = Math.round(settled * 100) / 100

    if (roundedSettled > 0) {
      transactions.push({
        from: { id: debtors[i].userId, name: debtors[i].name },
        to: { id: creditors[j].userId, name: creditors[j].name },
        amount: roundedSettled,
      })
    }

    debtors[i].net += settled
    creditors[j].net -= settled

    if (Math.abs(debtors[i].net) < 0.005) i++
    if (Math.abs(creditors[j].net) < 0.005) j++
  }

  return transactions
}

/**
 * Compute each member's net balance from expenses and settlements.
 * net > 0  → others owe this person
 * net < 0  → this person owes others
 */
export function computeBalances(
  members: { userId: string; name: string }[],
  expenses: { paid_by: string | null; splits: { user_id: string; amount: number }[] }[],
  settlements: { from_user: string | null; to_user: string | null; amount: number }[]
): MemberBalance[] {
  const netMap: Record<string, number> = {}
  members.forEach((m) => (netMap[m.userId] = 0))

  for (const expense of expenses) {
    if (!expense.paid_by) continue
    // Payer is credited the full amount
    if (expense.paid_by in netMap) {
      netMap[expense.paid_by] += expense.splits.reduce((s, sp) => s + sp.amount, 0)
    }
    // Each split participant owes their share
    for (const split of expense.splits) {
      if (split.user_id in netMap) {
        netMap[split.user_id] -= split.amount
      }
    }
  }

  for (const settlement of settlements) {
    if (settlement.from_user && settlement.from_user in netMap) {
      netMap[settlement.from_user] += settlement.amount
    }
    if (settlement.to_user && settlement.to_user in netMap) {
      netMap[settlement.to_user] -= settlement.amount
    }
  }

  return members.map((m) => ({
    userId: m.userId,
    name: m.name,
    net: Math.round(netMap[m.userId] * 100) / 100,
  }))
}
