import { config } from "dotenv";
import pg from "pg";

config({ path: ".env", quiet: true });

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "DATABASE_URL",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is missing.`);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 8000,
});

try {
  await client.connect();
  const table = await client.query("SELECT to_regclass($1) AS name", ["public.profiles"]);
  if (!table.rows[0]?.name) throw new Error("profiles table is missing.");

  const security = await client.query(
    "SELECT relrowsecurity AS enabled FROM pg_class WHERE oid = $1::regclass",
    ["public.profiles"],
  );
  const foreignKey = await client.query(
    "SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = $1::regclass AND confrelid = $2::regclass AND contype = 'f') AS present",
    ["public.profiles", "auth.users"],
  );
  if (!security.rows[0]?.enabled || !foreignKey.rows[0]?.present) {
    throw new Error("profiles security constraints are missing.");
  }
  await client.query("SELECT id FROM public.profiles LIMIT 1");
  console.log("Database: profiles table, RLS, auth foreign key, and query OK.");

  const sessions = await client.query("SELECT to_regclass($1) AS name", ["public.sessions"]);
  if (!sessions.rows[0]?.name) throw new Error("sessions table is missing.");
  const sessionSecurity = await client.query(
    "SELECT relrowsecurity AS enabled FROM pg_class WHERE oid = $1::regclass",
    ["public.sessions"],
  );
  const sessionForeignKey = await client.query(
    "SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = $1::regclass AND confrelid = $2::regclass AND contype = 'f') AS present",
    ["public.sessions", "public.profiles"],
  );
  const policies = await client.query(
    "SELECT count(*)::int AS count FROM pg_policies WHERE schemaname = $1 AND tablename = $2 AND cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')",
    ["public", "sessions"],
  );
  if (!sessionSecurity.rows[0]?.enabled || !sessionForeignKey.rows[0]?.present || policies.rows[0]?.count !== 4) {
    throw new Error("sessions ownership protections are missing.");
  }
  await client.query("SELECT id FROM public.sessions LIMIT 1");
  console.log("Database: sessions table, RLS, owner foreign key, four policies, and query OK.");

  const players = await client.query("SELECT to_regclass($1) AS name", ["public.players"]);
  if (!players.rows[0]?.name) throw new Error("players table is missing.");
  const playerSecurity = await client.query("SELECT relrowsecurity AS enabled FROM pg_class WHERE oid = $1::regclass", ["public.players"]);
  const playerForeignKey = await client.query(
    "SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = $1::regclass AND confrelid = $2::regclass AND contype = 'f') AS present",
    ["public.players", "public.sessions"],
  );
  const playerPolicies = await client.query(
    "SELECT count(*)::int AS count FROM pg_policies WHERE schemaname = $1 AND tablename = $2 AND cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')",
    ["public", "players"],
  );
  if (!playerSecurity.rows[0]?.enabled || !playerForeignKey.rows[0]?.present || playerPolicies.rows[0]?.count !== 4) {
    throw new Error("players ownership protections are missing.");
  }
  await client.query("SELECT id FROM public.players LIMIT 1");
  console.log("Database: players table, RLS, session foreign key, four policies, and query OK.");

  for (const tableName of ["teams", "matches", "rounds"]) {
    const table = await client.query("SELECT to_regclass($1) AS name", [`public.${tableName}`]);
    const security = await client.query("SELECT relrowsecurity AS enabled FROM pg_class WHERE oid = $1::regclass", [`public.${tableName}`]);
    const policies = await client.query(
      "SELECT count(*)::int AS count FROM pg_policies WHERE schemaname = 'public' AND tablename = $1 AND cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')",
      [tableName],
    );
    if (!table.rows[0]?.name || !security.rows[0]?.enabled || policies.rows[0]?.count !== 4) throw new Error(`${tableName} ownership protections are missing.`);
    await client.query(`SELECT id FROM public.${tableName} LIMIT 1`);
  }
  const roundForeignKey = await client.query(
    "SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.matches'::regclass AND confrelid = 'public.rounds'::regclass AND contype = 'f') AS present",
  );
  const removedAt = await client.query(
    "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'removed_at') AS present",
  );
  if (!roundForeignKey.rows[0]?.present || !removedAt.rows[0]?.present) throw new Error("Round links or player history protection are missing.");
  const scores = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matches' AND column_name IN ('score_a', 'score_b')");
  const scoreConstraints = await client.query("SELECT conname FROM pg_constraint WHERE conrelid = 'public.matches'::regclass AND conname IN ('matches_score_pair_check', 'matches_finished_score_check')");
  if (scores.rowCount !== 2 || scoreConstraints.rowCount !== 2) throw new Error("Match score columns or validation constraints are missing.");
  console.log("Database: teams, matches, and rounds have RLS; round links and player history protection are present.");

  const events = await client.query("SELECT to_regclass('public.match_events') AS name");
  const eventSecurity = await client.query("SELECT relrowsecurity AS enabled FROM pg_class WHERE oid = 'public.match_events'::regclass");
  const eventPolicies = await client.query("SELECT cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'match_events'");
  const eventLinks = await client.query("SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid = 'public.match_events'::regclass AND contype = 'f'");
  const eventWrite = await client.query("SELECT has_table_privilege('authenticated', 'public.match_events', 'INSERT') OR has_table_privilege('authenticated', 'public.match_events', 'UPDATE') OR has_table_privilege('authenticated', 'public.match_events', 'DELETE') AS allowed");
  if (!events.rows[0]?.name || !eventSecurity.rows[0]?.enabled || eventPolicies.rowCount !== 1 || eventPolicies.rows[0].cmd !== 'SELECT' || eventLinks.rows[0]?.count !== 2 || eventWrite.rows[0]?.allowed) throw new Error("Match event ownership or write protection is missing.");
  console.log("Database: match events are session-linked, owner-readable, and server-write-only.");

  const lifecycle = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name IN ('start_time', 'completed_at')");
  const finishPrivilege = await client.query("SELECT has_column_privilege('authenticated', 'public.sessions', 'completed_at', 'UPDATE') AS allowed");
  const matchStructurePrivilege = await client.query("SELECT has_column_privilege('authenticated', 'public.matches', 'team_a_id', 'UPDATE') AS allowed");
  const lockedPolicies = await client.query("SELECT tablename, cmd, COALESCE(qual, with_check, '') AS condition FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('players', 'rounds', 'teams', 'matches') AND cmd IN ('INSERT', 'DELETE')");
  if (lifecycle.rowCount !== 2 || finishPrivilege.rows[0]?.allowed || matchStructurePrivilege.rows[0]?.allowed || lockedPolicies.rowCount !== 8 || lockedPolicies.rows.some((row) => !row.condition.includes('completed_at'))) {
    throw new Error("Session scheduling or completed-session write protection is missing.");
  }
  console.log("Database: session time, explicit completion, and completed-roster write locks are present.");

  const avatarBucket = await client.query("SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'reticla-avatars'");
  const avatarPolicies = await client.query("SELECT cmd, qual, with_check FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'Reticla users % own avatars'");
  const policyCommands = new Set(avatarPolicies.rows.map((row) => row.cmd));
  if (avatarBucket.rowCount !== 1 || avatarBucket.rows[0].public || Number(avatarBucket.rows[0].file_size_limit) !== 2097152 || !['SELECT', 'INSERT', 'DELETE'].every((command) => policyCommands.has(command)) || avatarPolicies.rows.some((row) => !(row.qual ?? row.with_check ?? '').includes('foldername'))) {
    throw new Error("Private avatar bucket or user-scoped Storage policies are missing.");
  }
  console.log("Supabase Storage: private avatar bucket and user-scoped policies are present.");
} catch (error) {
  console.error("Database check failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

try {
  const health = new URL("/auth/v1/health", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const response = await fetch(health, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  console.log("Supabase Auth: reachable.");
} catch (error) {
  console.error("Supabase Auth check failed:", error.code ?? error.message);
  process.exitCode = 1;
}
