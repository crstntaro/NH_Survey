# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-brand restaurant survey administration platform for Nippon Hasha restaurants (Mendokoro Ramenba, Ramen Yushoken, Kazunori, Kazu Café). Built on Supabase with PostgreSQL backend, Deno Edge Functions, and static HTML/JavaScript frontend.

## Tech Stack

- **Frontend**: Static HTML/CSS/Vanilla JavaScript (no build step)
- **Backend**: Supabase Edge Functions (Deno/TypeScript)
- **Database**: PostgreSQL via Supabase with Row-Level Security (RLS)
- **Auth**: Supabase Auth + JWT with custom claims

## Common Commands

### Deploy Edge Functions
```bash
npx supabase functions deploy admin-auth
npx supabase functions deploy submit-survey
npx supabase functions deploy generate-reward
npx supabase functions deploy get-reward-details
```

### Create Admin Users
```bash
deno run --allow-net --allow-read --allow-write --allow-env scripts/create-admin-users.ts
```

### Link Supabase Project
```bash
npx supabase login
npx supabase link --project-ref <project-id>
```

### Set Secrets
```bash
npx supabase secrets set SUPABASE_URL=<url>
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
```

## Architecture

### Database Schema (5 migrations in order)
Run in Supabase SQL Editor sequentially:
1. `001_create_admin_tables.sql` - admin_users, admin_audit_log tables
2. `002_extend_survey_responses.sql` - NPS fields, ticket management, reward tracking
3. `003_create_indexes.sql` - Performance indexes
4. `004_rls_policies.sql` - Row-Level Security policies for multi-tenancy
5. `005_automated_functions.sql` - Triggers for NPS calculation, ticket prioritization

### Role-Based Access Control
- `super_admin`: Full access to all brands/branches
- `brand_admin`: Access to all branches within their brand
- `branch_admin`: Access only to their specific branch

RLS policies enforce data isolation automatically based on JWT claims (brand, branch, role).

### Edge Functions
| Function | Purpose |
|----------|---------|
| `admin-auth` | Login/logout/verify/refresh/change-password with rate limiting |
| `submit-survey` | Save survey responses and trigger reward generation |
| `generate-reward` | Create secure 12-char reward codes (GZ-prefix) |
| `get-reward-details` | Validate and retrieve reward information |

### Key Files
- `admin.html` - Admin dashboard SPA (87KB)
- `admin/js/auth.js` - Client-side JWT management with token refresh
- `[brand]survey.html` - Brand-specific survey forms (md, mr, kz, yk prefixes)
- `[brand]reward.html` - Brand-specific reward display pages

### Survey Workflow
1. Customer fills brand-specific survey form
2. `submit-survey` saves response → triggers `generate-reward`
3. Reward code displayed to customer
4. Admin dashboard shows surveys filtered by RLS
5. Admins can manage tickets and track reward claims

## Environment Variables

Required in `.env` files and Supabase secrets:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` / `ADMIN_SERVICE_ROLE_KEY` - Service role key
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

## Important Notes

- Database migrations must run in numbered order (001-005)
- `CREDENTIALS.md` contains generated admin passwords - never commit
- Rate limiting on login: 5 attempts per 15 minutes per email
- JWT tokens stored in localStorage with automatic refresh logic
- All admin actions logged to `admin_audit_log` table
