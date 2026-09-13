import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env", quiet: true });
if (!process.env.DIRECT_URL) throw new Error("DIRECT_URL is missing.");
const url = new URL(process.env.DIRECT_URL);
url.searchParams.set("uselibpqcompat", "true");
const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 8000 });
let inTransaction = false;

async function rejectedInsert(query, values) {
  await client.query("SAVEPOINT rejected_insert");
  let rejected = false;
  try { await client.query(query, values); }
  catch (error) { rejected = error.code === "42501"; }
  await client.query("ROLLBACK TO SAVEPOINT rejected_insert");
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
    if (ownerId) await client.query(
      "INSERT INTO public.profiles (id, display_name, username, updated_at) VALUES ($1, $2, $3, now())",
      [ownerId, "Temporary player test host", `player_rls_${randomUUID().replaceAll("-", "").slice(0, 18)}`],
    );
  }
  if (!ownerId) {
    console.log("Player ownership row test skipped: no authenticated account exists yet.");
    process.exitCode = 2;
  } else {
    const otherId = randomUUID();
    const session = await client.query("INSERT INTO public.sessions (owner_id, name, date, sport, updated_at) VALUES ($1, 'Player policy test', current_date, 'PADEL', now()) RETURNING id", [ownerId]);
    const secondSession = await client.query("INSERT INTO public.sessions (owner_id, name, date, sport, updated_at) VALUES ($1, 'Other player policy test', current_date, 'PADEL', now()) RETURNING id", [ownerId]);
    const secondSessionId = secondSession.rows[0].id;
    const sessionId = session.rows[0].id;
    const player = await client.query("INSERT INTO public.players (session_id, name, updated_at) VALUES ($1, 'Andi', now()) RETURNING id", [sessionId]);
    const playerId = player.rows[0].id;

    await client.query("SET LOCAL ROLE authenticated");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [otherId]);
    const otherRead = await client.query("SELECT id FROM public.players WHERE id = $1", [playerId]);
    const otherUpdate = await client.query("UPDATE public.players SET name = 'Unauthorized' WHERE id = $1 RETURNING id", [playerId]);
    const otherDelete = await client.query("DELETE FROM public.players WHERE id = $1 RETURNING id", [playerId]);
    const otherInsertRejected = await rejectedInsert("INSERT INTO public.players (session_id, name, updated_at) VALUES ($1, 'Unauthorized', now())", [sessionId]);
    const secondSessionRejected = await rejectedInsert("INSERT INTO public.players (session_id, name, updated_at) VALUES ($1, 'Unauthorized', now())", [secondSessionId]);

    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ownerId]);
    const ownRead = await client.query("SELECT id FROM public.players WHERE id = $1", [playerId]);
    const ownUpdate = await client.query("UPDATE public.players SET name = 'Budi' WHERE id = $1 RETURNING id", [playerId]);
    const ownInsert = await client.query("INSERT INTO public.players (session_id, name, updated_at) VALUES ($1, 'Charlie', now()) RETURNING id", [sessionId]);
    const sameNameOtherSession = await client.query("INSERT INTO public.players (session_id, name, updated_at) VALUES ($1, 'Budi', now()) RETURNING id", [secondSessionId]);
    const isolatedCount = await client.query("SELECT count(*)::int AS count FROM public.players WHERE session_id = $1", [secondSessionId]);
    const duplicateRejected = await (async () => {
      await client.query("SAVEPOINT duplicate_name");
      let rejected = false;
      try { await client.query("INSERT INTO public.players (session_id, name, updated_at) VALUES ($1, 'budi', now())", [sessionId]); }
      catch (error) { rejected = error.code === "23505"; }
      await client.query("ROLLBACK TO SAVEPOINT duplicate_name");
      return rejected;
    })();
    const ownDelete = await client.query("DELETE FROM public.players WHERE id = $1 RETURNING id", [playerId]);
    const ownInsertedDelete = await client.query("DELETE FROM public.players WHERE id = $1 RETURNING id", [ownInsert.rows[0]?.id]);
    if (otherRead.rowCount || otherUpdate.rowCount || otherDelete.rowCount || !otherInsertRejected || !secondSessionRejected || ownRead.rowCount !== 1 || ownUpdate.rowCount !== 1 || ownInsert.rowCount !== 1 || sameNameOtherSession.rowCount !== 1 || isolatedCount.rows[0]?.count !== 1 || !duplicateRejected || ownDelete.rowCount !== 1 || ownInsertedDelete.rowCount !== 1) {
      throw new Error("Player ownership or uniqueness policies did not enforce the expected access.");
    }
    console.log("Player ownership: cross-user CRUD denied; owner CRUD allowed; duplicate names rejected within each isolated session.");
  }
} catch (error) {
  console.error("Player ownership check failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally {
  if (inTransaction) await client.query("ROLLBACK").catch(() => {});
  await client.end().catch(() => {});
}
