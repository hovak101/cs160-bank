## Setup

1. **Install dependencies:** `npm install`
2. **Environment variables:** Create `.env.local` in the root and add your Supabase URL and Anon Key.
3. **Start local database:** `npx supabase start` (Access Local Studio at http://127.0.0.1:54323)
4. **Run development server:** `npm run dev` (App runs at http://localhost:3000)

---

## Workflow

### 1. Features (Frontend & Backend)
* **Frontend:** Edit the `page.tsx` corresponding to your route (e.g., for `/dashboard`, edit `/app/(bank)/dashboard/page.tsx`).
* **Backend:** Create or update the relevant API endpoints and test behavior.

### 2. Database Changes (Local-First Protocol)
**⚠️ CRITICAL: DO NOT make schema changes in the remote Supabase Dashboard.** Always make changes locally first:
1. Apply your schema changes in your Local Studio UI.
2. Generate a migration file: 
   `npx supabase db diff -f brief_name_of_change`
3. Update TypeScript types: 
   `npx supabase gen types typescript --local > lib/supabase/database.types.ts`
4. Commit the new `.sql` file (in `supabase/migrations/`) and `database.types.ts` to Git.

### 3. Syncing with Teammates
When pulling down database changes made by another teammate, do not use `db pull`. Instead:
1. `git pull`
2. `npx supabase db reset` (Wipes local DB and perfectly applies new migrations)