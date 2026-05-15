# Pocket — Roommate Expense Splitter

**Live demo:** https://pocket-expenses.vercel.app 

**Demo link:** https://drive.google.com/file/d/1gv3cyx6tDSGzZp0ebzZS2nF9VB0hPXQ_/view?usp=sharing

**Demo credentials:**
| User | Email | Password |
|---|---|---|
| Shreyas | shreyas@demo.com | demo1234 |
| Akash | akash@demo.com | demo1234 |
| Kritika | kritika@demo.com | demo1234 |

**Demo group invite code:** `DEMO0001`

> Split expenses with roommates. Know who owes whom at a glance. Settle up in one tap.

---

## How to run locally

```bash
git clone https://github.com/your-name/pocket.git
cd pocket
npm install
cp .env.example .env.local   # fill in your Supabase credentials
```

**Apply schema (once):**

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/caivdtzwlsjlghplzhao/editor)
2. Paste and run `supabase/migrations/001_initial.sql`

**Seed demo data:**

```bash
npm run seed
```

**Start dev server:**

```bash
npm run dev
# Open http://localhost:3000
```

---

## Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSR + API routes in one repo; best Vercel fit |
| Database | Supabase (PostgreSQL) | Managed Postgres, built-in Auth, RLS |
| Auth | Supabase anonymous auth | Name-only login — no password required for regular users |
| UI | Tailwind CSS v4 + Radix UI | Fast, accessible, minimal bundle |
| Forms | React Hook Form v7 + Zod v4 | Type-safe validation |
| Deployment | Vercel | Auto-deploy from GitHub, zero-config |

---

## Features

- **Create groups** — name your group, get a shareable 8-character invite code
- **Join groups** — enter the invite code from the dashboard
- **Add expenses** — equal or custom (unequal) splits, payer selection, date, notes
- **Balance view** — shows who owes whom using the netting algorithm
- **Settle up** — one-tap settlement with full audit trail
- **Activity log** — all settlements in one place
- **CSV export** — download the group's expense history
- **Recurring expenses** — mark an expense as monthly with day-of-month

---

## Balance netting algorithm

Minimizes the number of transactions to settle all debts across N people.

**Example (3 people):**
- Rent: Shreyas paid ₹45,000, split ₹15,000 each
- Groceries: Kritika paid ₹2,400, split equally
- Dining: Akash paid ₹1,800 (unequal)

**Net balances:** Shreyas +₹30,000, Akash -₹13,200, Kritika +₹600

**Result:** 2 transactions (not 3+):
- Akash → Shreyas ₹12,600
- Akash → Kritika ₹600

Implementation: greedy matching of largest creditor against largest debtor. See `lib/netting.ts`.

---

## Currency conversion (for international use)

To handle multiple currencies I would:
1. Store `currency_code` per group (`INR`, `USD`, `EUR`)
2. Lock `exchange_rate_at_creation` on each expense to avoid disputes on rate changes
3. Use a free rates API (Open Exchange Rates / Fixer.io) via a server-side cron job
4. Convert all amounts to a base currency for balance math, show original currency in expense list
5. Let users set a preferred display currency in their profile

---

## What's NOT done (de-scoped)

- Receipt photo upload (excluded per requirements)
- Push notifications / email reminders
- Native mobile app
- In-app member messaging

## In production, I would also add

- Email/SMS settlement reminders via Resend/Twilio
- Real-time balance updates with Supabase Realtime
- Soft-delete for expenses
- Unit tests for the netting algorithm
- Rate limiting on API routes
