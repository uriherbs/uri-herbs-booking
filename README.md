# Uri Herbs Workshop — Booking & Admin System

Phase 1 B2C MVP. Next.js 14 (App Router) + Supabase.

## Structure

```
src/
├── app/
│   ├── page.tsx                          Home → links to /book
│   ├── layout.tsx                        Root layout
│   ├── book/page.tsx                     Customer booking flow (5 steps)
│   ├── admin/
│   │   ├── layout.tsx                    Provides AuthProvider to all /admin routes
│   │   ├── login/page.tsx                Public — staff sign in
│   │   └── (protected)/                  Route group — everything here requires admin_staff
│   │       ├── layout.tsx                Applies ProtectedRoute
│   │       └── page.tsx                  The dashboard itself, serves at /admin
│   └── api/calendar/ical.ics/route.ts    OTA calendar sync feed (Klook, GetYourGuide, etc.)
├── components/
│   └── AdminDashboard.tsx                The dashboard UI (imported by admin/(protected)/page.tsx)
└── lib/
    ├── supabase.ts                       Client + service-role client factory
    ├── types.ts                          Shared TypeScript types
    ├── booking-service.ts                Availability + booking API wrapper functions
    ├── hooks.ts                          React hooks (live availability, admin data, realtime)
    ├── auth.ts / auth-context.tsx        Supabase Auth + admin_staff allowlist check
    ├── protected-route.tsx               Client-side access-denied screen
    ├── notifications.ts                  Email/WhatsApp template builders
    └── ical.ts                           RFC 5545 calendar feed builder

middleware.ts                             Edge-level route protection for /admin/*
supabase/functions/send-notifications/    Edge Function — sends confirmation emails via Resend
```

## Before You Deploy

1. **Database**: run `uri-herbs-COMBINED-DEPLOY.sql` (or the individual scripts in dependency order — see `DEPLOYMENT_GUIDE.md`) in your Supabase project's SQL Editor
2. **Environment variables**: copy `.env.example` to `.env.local`, fill in real values
3. **First admin user**: create a Supabase Auth user, then `INSERT INTO admin_staff (...)` — see `admin-auth-setup.sql`

Full walkthrough: `DEPLOYMENT_GUIDE.md`. Pre-launch testing: `PRE_LAUNCH_CHECKLIST.md`.

## Local Development

```bash
npm install
npm run dev
```

Visit `localhost:3000/book` (customer flow) and `localhost:3000/admin` (staff dashboard, requires login).
