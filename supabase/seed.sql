-- ============================================================
-- SEED: Demo users and group for judges
-- Run this AFTER applying the schema migration
-- ============================================================

-- Step 1: Create demo auth users (email/password)
-- These are inserted via Supabase Auth API or Dashboard.
-- Credentials:
--   shreyas@demo.com / demo1234
--   akash@demo.com   / demo1234
--   kritika@demo.com / demo1234

-- Step 2: After creating auth users, insert their profiles.
-- Replace the UUIDs below with the actual IDs from auth.users
-- after creating the accounts via Supabase Dashboard > Auth > Users.

-- PLACEHOLDER UUIDs — replace after creating auth users:
-- shreyas_id  = will be set by trigger automatically from name metadata
-- akash_id    = will be set by trigger automatically from name metadata
-- kritika_id  = will be set by trigger automatically from name metadata

-- The application seed.ts script handles this programmatically.
-- See /scripts/seed.ts for the full seeding logic.

select 'Seed file: run scripts/seed.ts to populate demo data' as info;
