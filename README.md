## Initial Setup



1. **Clone the repository and install dependencies:**

   `npm install`



2. **Set up your environment variables:**

   Create a `.env.local` file in the root of the project. Get the following environment variables from the supabase dashboard and add this to the file:

   `NEXT_PUBLIC_SUPABASE_URL=your_remote_project_url`

   `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_remote_anon_key`

   `SUPABASE_SERVICE_ROLE_KEY=the_supabase_service_role_key`

3. **Run the development server:**

   `npm run dev`

   The app will be available at http://localhost:3000 and will connect directly to our remote Supabase database.



## Workflow

### Implementing Feature

Basically 3 steps:

1. Frontend

   - Go to page.tsx of folder path corresponding to the url you're working on

      - For example, if you're working on the bank.com/dashboard url, you would edit page.tsx in /app/(bank)/dashboard

2. Backend

   - Create an endpoint to get and return the data requested from endpoint

   - Make sure to test for correct behavior!

3. See DB Steps Below

### Database Changes

1. Make any structural changes (creating tables, columns, or Row Level Security policies) directly in the remote Supabase Dashboard, one person at a time.

2. Once your changes are working, open your terminal and pull the updated schema into the codebase:

   `npx supabase db pull`

3. Also, run this to update typescript types:

   `npx supabase gen types typescript --linked > lib/supabase/database.types.ts`

4. This command updates the `.sql` files inside the `supabase/migrations/` directory.

5. Commit these changes to Git. This acts as our database documentation and backup.
