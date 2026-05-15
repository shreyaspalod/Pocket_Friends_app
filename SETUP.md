# Pocket — One-Time Setup

## Step 1: Apply Database Schema

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/caivdtzwlsjlghplzhao)
2. Go to **SQL Editor** (left sidebar)
3. Click **+ New query**
4. Copy-paste the entire contents of `supabase/migrations/001_initial.sql`
5. Click **Run**

You should see a success message. If there are errors about tables already existing, that's fine.

## Step 2: Seed Demo Data

After the schema is applied, run:

```bash
npm run seed
```

This creates 3 demo users and a pre-populated "The Flat" group with sample expenses.

Demo credentials:
- `shreyas@demo.com` / `demo1234`
- `akash@demo.com` / `demo1234`
- `kritika@demo.com` / `demo1234`

Demo invite code: **DEMO0001**

## Step 3: Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

## Step 4: Deploy to Vercel

1. Push to GitHub
2. Import repo on [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy
