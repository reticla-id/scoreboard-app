import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env", quiet: true });
if (!process.env.DIRECT_URL) throw new Error("DIRECT_URL is missing.");
const url = new URL(process.env.DIRECT_URL);
url.searchParams.set("uselibpqcompat", "true");
const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 8000 });
let inTransaction = false;

async function denied(sql, values) {
  await client.query("SAVEPOINT blocked_action");
  let rejected = false;
  try { await client.query(sql, values); } catch (error) { rejected = error.code === "42501"; }
  await client.query("ROLLBACK TO SAVEPOINT blocked_action");
  return rejected;
}

try {
  await client.connect();
  await client.query("BEGIN");
  inTransaction = true;
  const profiles = await client.query("SELECT id FROM public.profiles LIMIT 1");
  let ownerId = profiles.rows[0]?.id;
  if (!ownerId) {
    const users = await client.query("SELECT id FROM auth.users LIMIT 1");
    ownerId = users.rows[0]?.id;
    if (ownerId) await client.query("INSERT INTO public.profiles (id, display_name, username, updated_at) VALUES ($1, 'Temporary host', $2, now())", [ownerId, `lifecycle_${randomUUID().replaceAll("-", "").slice(0, 18)}`]);
  }
  if (!ownerId) {
    console.log("Lifecycle row test skipped: no authenticated account exists yet.");
    process.exitCode = 2;
  } else {
    const created = await client.query("INSERT INTO public.sessions (owner_id, name, date, start_time, sport, updated_at) VALUES ($1, 'Lifecycle check', current_date, '19:00', 'PADEL', now()) RETURNING id", [ownerId]);
    const sessionId = created.rows[0].id;
    await client.query("INSERT INTO public.players (session_id, name, updated_at) VALUES ($1, 'Before finish', now())", [sessionId]);
    await client.query("UPDATE public.sessions SET completed_at = now() WHERE id = $1", [sessionId]);
    await client.query("SET LOCAL ROLE authenticated");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ownerId]);
    const visible = await client.query("SELECT id FROM public.sessions WHERE id = $1 AND completed_at IS NOT NULL", [sessionId]);
    const roster = await client.query("SELECT name FROM public.players WHERE session_id = $1", [sessionId]);
    const playerBlocked = await denied("INSERT INTO public.players (session_id, name, updated_at) VALUES ($1, 'After finish', now())", [sessionId]);
    const roundBlocked = await denied("INSERT INTO public.rounds (session_id, number) VALUES ($1, 1)", [sessionId]);
    const reopenBlocked = await denied("UPDATE public.sessions SET completed_at = NULL WHERE id = $1", [sessionId]);
    if (visible.rowCount !== 1 || roster.rowCount !== 1 || !playerBlocked || !roundBlocked || !reopenBlocked) throw new Error("Finished-session protection did not enforce the expected lifecycle.");
    console.log("Session lifecycle: finished sessions remain readable; roster writes, new rounds, and reopening are denied.");
  }
} catch (error) {
  console.error("Lifecycle check failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally {
  if (inTransaction) await client.query("ROLLBACK").catch(() => {});
  await client.end().catch(() => {});
}
