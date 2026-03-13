# Vitality Bank — Project Guide

## Overview

This is a banking application for a bank called **Vitality**. Built with Next.js (App Router) and Supabase.

## Planned Features

- Sign up / login for customers and managers
- Open and close accounts (customer)
- Find nearest Chase ATM (customer)
- Deposit cheque via camera/screenshot (customer)
- Automated bill payments from checking to credit account (customer)
- Manager dashboard: read-only, report generation, customer queries

## Tech Stack

- **Framework**: Next.js with App Router
- **Backend**: Supabase (Postgres, Auth, RLS)
- **Supabase types**: `lib/supabase/database.types.ts`
- **SQL / RLS policies**: `supabase/` directory

### Database Migrations
When adding a new migration SQL file under `supabase/`, always remind the user to run:
```
npx supabase db push
```
to apply the migration to the linked Supabase project.

## Architecture & Code Organization

### Data Flow
Pages (`app/`) → API routes (`app/api/`) → React components (`components/`)

- **Pages** only handle routing and pass props; all data fetching lives in `app/api/`
- **`app/api/`** is currently empty — all server-side data fetching and mutations go here
- **`components/`** holds all React components organized into sub-folders by feature/domain (e.g., `components/accounts/`, `components/transactions/`, `components/auth/`)
- Keep components pure and presentational where possible; data logic stays in API routes

### Protected Routes
There are two separate protected pathways:
- `/customer/...` — accessible only to users with role `customer`
- `/manager/...` — accessible only to users with role `manager`
- Customers must not access manager routes; managers must not access customer routes
- Role is stored in the `users` table (`role` enum: `customer | manager | admin | auditor`)

## Design & Theme

- **Colors**: Teal (primary), Coral (accent), Charcoal (base/text)
- **Vibe**: Modern, dense, fintech — think Bloomberg terminal meets clean SaaS
- Global styles live in `globals.css`

## Development Principles

1. **Simplicity and correct functionality above all** — no gold-plating
2. **Modular architecture** — pages fetch via `app/api/`, pass to components
3. **Robust validation** — validate fields on both frontend and backend
4. **Error handling** — meaningful error messages for all user-facing operations
5. **RLS enforced** — never trust the client; all access controlled via Supabase Row Level Security
6. **No over-engineering** — only build what is needed now; avoid premature abstractions

## UI & Tooling

### Font
**Inter** via `next/font/google` (`--font-inter` CSS variable). Chosen for tabular numerals (critical for financial figures), neo-grotesque precision, and institutional credibility. Do not use Geist or other fonts.

### Components
- Use **shadcn/ui** components as the base layer (`components/ui/`); install new ones with `npx shadcn@latest add <name>`
- Create custom components in `components/<feature>/` for feature-specific or visually bespoke needs
- Landing page components live in `components/landing/`

### Icons
- **Lucide React** is the icon library; import only the icons actually used
- Prefer Lucide over inline SVG or other icon sets

### Teal Glow Effects
- Hero background glow: `bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(174_72%_42%_/_0.12),transparent_70%)]`
- Card hover glow (teal): `hover:shadow-[0_0_40px_-8px_hsl(174_72%_42%_/_0.25)]`
- Card ambient glow (coral): `shadow-[0_0_40px_-8px_hsl(12_85%_60%_/_0.15)]`

### Dark Mode Scoping
The landing page wraps content in `<div className="dark ...">` to apply the Vitality charcoal palette locally without forcing dark mode on authenticated app routes.
