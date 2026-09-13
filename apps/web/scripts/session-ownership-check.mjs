import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env", quiet: true });

if (!process.env.DIRECT_URL) throw new Error("DIRECT_URL is missing.");
const url = new URL(process.env.DIRECT_URL);
url.searchParams.set("uselibpqcompat", "true");
const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 8000 });
let inTransaction = false;

try {
  await client.connect();
  await client.query("BEGIN");
  inTransaction = true;

  const profiles = await client.query("SELECT id FROM public.profiles LIMIT 1");
  let ownerId = profiles.rows[0]?.id;
  if (!ownerId) {
    const users = await client.query("SELECT id FROM auth.users LIMIT 1");
    ownerId = users.rows[0]?.id;
    if (!ownerId) {
      console.log("Ownership row test skipped: no authenticated account exists yet.");
      process.exitCode = 2;
    } else {
      await client.query(
        "INSERT INTO public.profiles (id, display_name, username, updated_at) VALUES ($1, $2, $3, now())",
        [ownerId, "Temporary test host", `rls_test_${randomUUID().replaceAll("-", "").slice(0, 18)}`],
      );
    }
  }

  if (ownerId) {
    const otherId = randomUUID();
    const created = await client.query(
      "INSERT INTO public.sessions (owner_id, name, date, sport, updated_at) VALUES ($1, $2, current_date, 'PADEL', now()) RETURNING id",
      [ownerId, "Temporary ownership test"],
    );
    const sessionId = created.rows[0].id;
    await client.query("SET LOCAL ROLE authenticated");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [otherId]);
    const otherRead = await client.query("SELECT id FROM public.sessions WHERE id = $1", [sessionId]);
    const otherUpdate = await client.query("UPDATE public.sessions SET name = $2 WHERE id = $1 RETURNING id", [sessionId, "Unauthorized edit"]);
    const otherDelete = await client.query("DELETE FROM public.sessions WHERE id = $1 RETURNING id", [sessionId]);

    await client.query("SAVEPOINT reject_insert");
    let insertRejected = false;
    try {
      await client.query(
        "INSERT INTO public.sessions (owner_id, name, date, sport, updated_at) VALUES ($1, $2, current_date, 'PADEL', now())",
        [ownerId, "Unauthorized create"],
      );
    } catch (error) {
      insertRejected = error.code === "42501";
    }
    await client.query("ROLLBACK TO SAVEPOINT reject_insert");

    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ownerId]);
    const ownInsert = await client.query(
      "INSERT INTO public.sessions (owner_id, name, date, sport, updated_at) VALUES ($1, $2, current_date, 'PADEL', now()) RETURNING id",
      [ownerId, "Authorized create"],
    );
    const ownRead = await client.query("SELECT id FROM public.sessions WHERE id = $1", [sessionId]);
    const ownUpdate = await client.query("UPDATE public.sessions SET name = $2 WHERE id = $1 RETURNING id", [sessionId, "Authorized edit"]);
    const ownDelete = await client.query("DELETE FROM public.sessions WHERE id = $1 RETURNING id", [sessionId]);
    const ownInsertedDelete = await client.query("DELETE FROM public.sessions WHERE id = $1 RETURNING id", [ownInsert.rows[0]?.id]);

    if (otherRead.rowCount !== 0 || otherUpdate.rowCount !== 0 || otherDelete.rowCount !== 0 || !insertRejected || ownInsert.rowCount !== 1 || ownRead.rowCount !== 1 || ownUpdate.rowCount !== 1 || ownDelete.rowCount !== 1 || ownInsertedDelete.rowCount !== 1) {
      throw new Error("Session ownership policies did not enforce the expected access.");
    }
    console.log("Session ownership: cross-user CRUD denied; owner CRUD allowed.");
  }
} catch (error) {
  console.error("Ownership check failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally {
  if (inTransaction) await client.query("ROLLBACK").catch(() => {});
  await client.end().catch(() => {});
}
