# Supabase Auth & RLS — Setup Notes (MVP scaffold)

1) Create a Supabase project

- In Supabase, enable Email and Google OAuth providers.
- Copy the `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` into your environment.

2) Environment variables (example `.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
GEMINI_API_KEY=...
```

3) Client vs Server keys
- Use the public anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the browser client for sign-in flows.
- Use the `SUPABASE_SERVICE_ROLE_KEY` only server-side (API routes) to perform inserts that require elevated privileges (e.g., creating embeddings rows). Keep it secret.

4) Row Level Security (RLS)
- We included `db/rls.sql` showing example policies that allow only the authenticated user (`auth.uid()`) to access their rows.
- In production, enable RLS on tables and create similar policies for every user-scoped table.

5) Server-side auth best practice
- Verify the user's JWT in API routes rather than relying on custom headers. Example flow:
  - Client obtains access token after sign-in and forwards it in `Authorization: Bearer <token>`.
  - Server validates the token and extracts `user.id` (via Supabase or a JWT library) and uses that `user_id` when inserting rows.

6) Next steps for scaffold
- Wire client sign-in using Supabase JS in `lib/supabaseClient.ts` and expose a small `AuthButton` component.
- Harden API routes to validate JWT and set `user_id` from token automatically.
