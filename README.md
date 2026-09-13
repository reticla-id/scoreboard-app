# Reticla

Reticla is a personal padel workspace for community hosts. The Next.js App Router application is in `apps/web`. It supports authentication, isolated sessions, session-specific rosters, and complete doubles rounds.

## Local setup

1. Use Node.js 20.9+ and run `npm install` from the repository root.
2. Copy `apps/web/.env.example` to `apps/web/.env` and replace its placeholders. Keep `.env` private.
3. In Supabase Auth, enable email/password and Google. Set the site URL to `APP_URL`, allow `${APP_URL}/auth/callback` as a redirect URL, and configure Google credentials in Supabase.
4. Run `npm run db:migrate` to apply the PostgreSQL migrations, including rounds and player roster history.
5. Run `npm run db:generate`, then `npm run dev`.

`DATABASE_URL` is the server-only transaction-pooler PostgreSQL URL for Prisma runtime queries. `DIRECT_URL` is the direct or session-pooler URL for Prisma migrations. Both should require TLS in hosted environments. `APP_URL` is the canonical browser origin used in email confirmation links. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public project settings. No service-role key is used.

## Courtside flow

The dashboard separates **Current sessions** from **History**. A current session has an upcoming date or unfinished games; a past session with no unfinished games moves into History. Each current session shows its roster, round count, and contextual next action.

Open a session, add or import players on **Players**, and use **Generate Round** when at least four players are saved. The generator pairs distinct partnerships into valid doubles games. Without the practical cap, it uses each partnership at most once, producing `floor(C(playerCount, 2) / 2)` games: 4 players make 3 matches, 8 make 14, and 12 make 33. Player appearances differ by at most one game. It randomizes equivalent assignments and display order, saves the next numbered round, and takes the host to **Matches**. Later rounds use the current roster and leave earlier games intact. Match pages show 50 games at a time so large rounds remain responsive.

For very large rosters, a round contains at most 500 balanced matches instead of an impractical full schedule. The generator still includes every player and never repeats a partnership within that round. **Reset matches** requires confirmation and removes every generated round, match, and team while preserving players. Matches can be marked Upcoming, Live, or Finished. Scores, events, and leaderboards belong to later phases.

Player entry stays open for repeated names. Import methods (text, CSV, XLSX) appear only after choosing Import List and preview rows before saving. Removed players disappear from the active roster but remain linked to earlier games; the active roster can reuse a removed name.

## Data and security

Migrations create `profiles`, `sessions`, `players`, `rounds`, `teams`, and `matches`. Composite foreign keys enforce same-session player, team, round, and match links. RLS limits each table to its session owner; server actions also verify authentication and ownership before every operation. Round generation runs in a transaction under a session row lock. All records stay private to the host.

## Checks

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` from the root. Run `npm run backend:check` to verify the live schema and Supabase Auth endpoint. Run `npm run test:ownership` for rollback-only database ownership and isolation tests.

The PWA has an install manifest and offline fallback shell. Authenticated data is never cached for offline use.
