# Decisions Log — Pocket (Case 2)

## Assumptions I made

1. "Name is enough" auth means anonymous sessions — users enter a display name, Supabase anonymous auth creates the session, profile stored separately.
2. Demo users for judges use email+password so they get consistent sessions across devices; regular users get anonymous auth.
3. A group can have unlimited members — no hard cap specified.
4. "Settle up" records the full suggested transaction as-is; partial settlements are not required.
5. Currency is fixed to ₹ (INR) per requirements — no multi-currency in v1.
6. Recurring expenses store the recurrence config but auto-generation is a cron job (not implemented in v1).

## Trade-offs

| Choice | Alternative | Why I picked this |
|---|---|---|
| Next.js 16 (App Router) | Vite + Express | SSR + API routes in one repo; Vercel auto-detects it |
| Supabase anonymous auth | localStorage UUID | Works with RLS; session persists across devices via cookies |
| Radix UI primitives | shadcn/ui CLI install | No CLI needed — copy-paste for full control and fewer dependencies |
| Server components + `createClient()` | React Query on client | Faster initial load; data fetched at the edge |
| Greedy netting O(n log n) | LP solver | Greedy is optimal for minimizing transaction count in practice |
| Tailwind CSS v4 | CSS Modules | Faster iteration, no separate CSS files to maintain |
| `as unknown as T` type casts for Supabase joins | Full Relationships type | Avoided 200+ lines of Relationship definitions for a demo project |

## What I de-scoped and why

- Receipt photo upload — explicitly excluded per requirements
- Push/email notifications — adds SMTP/service complexity; overkill for demo
- Partial settle-up — adds UX complexity; full settlement covers the core use case
- Recurring expense auto-generation — needs a cron job / background worker; UI to configure it is built, auto-run is not

## What I'd do differently with another day

- Add Supabase Realtime so balances update live when a roommate adds an expense
- Write Jest unit tests for `lib/netting.ts` with edge cases (zero balances, single member, rounding)
- Add optimistic UI updates so the balance view refreshes instantly after adding an expense
- Set up proper Supabase schema migrations with the CLI (`supabase db push`) instead of manual SQL paste
