import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env", quiet: true });
if (!process.env.DIRECT_URL) throw new Error("DIRECT_URL is missing.");
const url = new URL(process.env.DIRECT_URL);
url.searchParams.set("uselibpqcompat", "true");
const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 8000 });
let inTransaction = false;

async function rejected(code, query, values) {
  await client.query("SAVEPOINT reject_case");
  let blocked = false;
  try { await client.query(query, values); }
  catch (error) { blocked = error.code === code; }
  await client.query("ROLLBACK TO SAVEPOINT reject_case");
  return blocked;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await client.connect();
  await client.query("BEGIN");
  inTransaction = true;
  let ownerId = (await client.query("SELECT id FROM public.profiles LIMIT 1")).rows[0]?.id;
  if (!ownerId) {
    ownerId = (await client.query("SELECT id FROM auth.users LIMIT 1")).rows[0]?.id;
    if (ownerId) await client.query("INSERT INTO public.profiles (id, display_name, username, updated_at) VALUES ($1, 'Temporary match test host', $2, now())", [ownerId, `match_rls_${randomUUID().replaceAll("-", "").slice(0, 18)}`]);
  }
  if (!ownerId) {
    console.log("Match ownership row test skipped: no authenticated account exists yet.");
    process.exitCode = 2;
  } else {
    const otherId = randomUUID();
    const ownSession = (await client.query("INSERT INTO public.sessions (owner_id, name, date, sport, updated_at) VALUES ($1, 'Match policy test', current_date, 'PADEL', now()) RETURNING id", [ownerId])).rows[0].id;
    const secondSession = (await client.query("INSERT INTO public.sessions (owner_id, name, date, sport, updated_at) VALUES ($1, 'Second match policy test', current_date, 'PADEL', now()) RETURNING id", [ownerId])).rows[0].id;
    const players = [];
    for (const name of ["Andi", "Budi", "Charlie", "Dimas"]) players.push((await client.query("INSERT INTO public.players (session_id, name, updated_at) VALUES ($1, $2, now()) RETURNING id", [ownSession, name])).rows[0].id);
    const otherPlayers = [];
    for (const name of ["Eka", "Fajar"]) otherPlayers.push((await client.query("INSERT INTO public.players (session_id, name, updated_at) VALUES ($1, $2, now()) RETURNING id", [secondSession, name])).rows[0].id);
    const round1 = (await client.query("INSERT INTO public.rounds (session_id, number) VALUES ($1, 1) RETURNING id", [ownSession])).rows[0].id;
    const otherRound = (await client.query("INSERT INTO public.rounds (session_id, number) VALUES ($1, 1) RETURNING id", [secondSession])).rows[0].id;
    const teamA = (await client.query("INSERT INTO public.teams (session_id, player_one_id, player_two_id) VALUES ($1, $2, $3) RETURNING id", [ownSession, players[0], players[1]])).rows[0].id;
    const teamB = (await client.query("INSERT INTO public.teams (session_id, player_one_id, player_two_id) VALUES ($1, $2, $3) RETURNING id", [ownSession, players[2], players[3]])).rows[0].id;
    const otherTeam = (await client.query("INSERT INTO public.teams (session_id, player_one_id, player_two_id) VALUES ($1, $2, $3) RETURNING id", [secondSession, otherPlayers[0], otherPlayers[1]])).rows[0].id;
    const match = (await client.query("INSERT INTO public.matches (session_id, round_id, team_a_id, team_b_id, position, updated_at) VALUES ($1, $2, $3, $4, 1, now()) RETURNING id", [ownSession, round1, teamA, teamB])).rows[0].id;

    await client.query("SET LOCAL ROLE authenticated");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [otherId]);
    for (const table of ["rounds", "teams", "matches"]) {
      const id = table === "rounds" ? round1 : table === "teams" ? teamA : match;
      assert((await client.query(`SELECT id FROM public.${table} WHERE id = $1`, [id])).rowCount === 0, `${table}: another user could read it.`);
      assert((await client.query(`DELETE FROM public.${table} WHERE id = $1 RETURNING id`, [id])).rowCount === 0, `${table}: another user could delete it.`);
    }
    assert((await client.query("UPDATE public.matches SET status = 'LIVE' WHERE id = $1 RETURNING id", [match])).rowCount === 0, "Another user could edit a match.");
    assert((await client.query("UPDATE public.matches SET score_a = 6, score_b = 4 WHERE id = $1 RETURNING id", [match])).rowCount === 0, "Another user could edit a score.");
    assert((await client.query("UPDATE public.rounds SET number = 3 WHERE id = $1 RETURNING id", [round1])).rowCount === 0, "Another user could edit a round.");
    assert(await rejected("42501", "INSERT INTO public.rounds (session_id, number) VALUES ($1, 2)", [ownSession]), "Another user could add a round.");
    assert(await rejected("42501", "INSERT INTO public.matches (session_id, round_id, team_a_id, team_b_id, position, updated_at) VALUES ($1, $2, $3, $4, 2, now())", [ownSession, round1, teamA, teamB]), "Another user could add a match.");

    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ownerId]);
    assert((await client.query("SELECT id FROM public.rounds WHERE id = $1", [round1])).rowCount === 1, "Owner cannot read round.");
    assert((await client.query("UPDATE public.matches SET status = 'LIVE' WHERE id = $1 RETURNING id", [match])).rowCount === 1, "Owner cannot start match.");
    assert(await rejected("23514", "UPDATE public.matches SET score_a = 6 WHERE id = $1", [match]), "A one-sided score was allowed.");
    assert(await rejected("23514", "UPDATE public.matches SET score_a = -1, score_b = 0 WHERE id = $1", [match]), "A negative score was allowed.");
    assert((await client.query("UPDATE public.matches SET score_a = 1, score_b = 0 WHERE id = $1 RETURNING id", [match])).rowCount === 1, "Owner cannot edit score.");
    assert((await client.query("UPDATE public.matches SET score_a = 0, score_b = 0 WHERE id = $1 RETURNING id", [match])).rowCount === 1, "Owner cannot reset score.");
    assert((await client.query("UPDATE public.matches SET score_a = 6, score_b = 4 WHERE id = $1 RETURNING id", [match])).rowCount === 1, "Owner cannot set result.");
    assert((await client.query("UPDATE public.matches SET status = 'FINISHED' WHERE id = $1 RETURNING id", [match])).rowCount === 1, "Owner cannot finish match.");
    assert(await rejected("23514", "UPDATE public.matches SET score_a = 4, score_b = 4 WHERE id = $1", [match]), "A tied finished score was allowed.");
    assert((await client.query("UPDATE public.matches SET score_a = 4, score_b = 6 WHERE id = $1 AND status = 'FINISHED' AND score_a IS NOT DISTINCT FROM 6 AND score_b IS NOT DISTINCT FROM 4 RETURNING id", [match])).rowCount === 1, "Finished score could not be corrected.");
    await client.query("RESET ROLE");
    const eventId = (await client.query("INSERT INTO public.match_events (session_id, match_id, player_id, type) VALUES ($1, $2, $3, 'W') RETURNING id", [ownSession, match, players[0]])).rows[0].id;
    assert(await rejected("23514", "INSERT INTO public.match_events (session_id, match_id, player_id, type) VALUES ($1, $2, $3, 'ZZ')", [ownSession, match, players[0]]), "Invalid event type was allowed.");
    assert(await rejected("23503", "INSERT INTO public.match_events (session_id, match_id, player_id, type) VALUES ($1, $2, $3, 'W')", [ownSession, match, otherPlayers[0]]), "Cross-session event player was allowed.");
    await client.query("SET LOCAL ROLE authenticated");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ownerId]);
    assert((await client.query("SELECT id FROM public.match_events WHERE id = $1", [eventId])).rowCount === 1, "Owner cannot read match events.");
    assert(await rejected("42501", "INSERT INTO public.match_events (session_id, match_id, player_id, type) VALUES ($1, $2, $3, 'W')", [ownSession, match, players[0]]), "Client could bypass atomic event recording.");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [otherId]);
    assert((await client.query("SELECT id FROM public.match_events WHERE id = $1", [eventId])).rowCount === 0, "Another user could read match events.");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ownerId]);
    assert(await rejected("23503", "INSERT INTO public.teams (session_id, player_one_id, player_two_id) VALUES ($1, $2, $3)", [ownSession, players[0], otherPlayers[0]]), "Cross-session player link was allowed.");
    assert(await rejected("23503", "INSERT INTO public.matches (session_id, round_id, team_a_id, team_b_id, position, updated_at) VALUES ($1, $2, $3, $4, 2, now())", [ownSession, round1, teamA, otherTeam]), "Cross-session team link was allowed.");
    assert(await rejected("23503", "INSERT INTO public.matches (session_id, round_id, team_a_id, team_b_id, position, updated_at) VALUES ($1, $2, $3, $4, 2, now())", [ownSession, otherRound, teamA, teamB]), "Cross-session round link was allowed.");
    assert(await rejected("23514", "UPDATE public.matches SET status = 'SCORING' WHERE id = $1", [match]), "Invalid match state was allowed.");

    const round2 = (await client.query("INSERT INTO public.rounds (session_id, number) VALUES ($1, 2) RETURNING id", [ownSession])).rows[0].id;
    const secondMatch = (await client.query("INSERT INTO public.matches (session_id, round_id, team_a_id, team_b_id, position, updated_at) VALUES ($1, $2, $3, $4, 1, now()) RETURNING id", [ownSession, round2, teamA, teamB])).rows[0].id;
    assert((await client.query("UPDATE public.players SET removed_at = now() WHERE id = $1 RETURNING id", [players[0]])).rowCount === 1, "Player could not be removed from the roster.");
    assert((await client.query("SELECT id FROM public.matches WHERE id IN ($1, $2)", [match, secondMatch])).rowCount === 2, "Removing a player erased historical matches.");
    assert((await client.query("INSERT INTO public.players (session_id, name, updated_at) VALUES ($1, 'Andi', now()) RETURNING id", [ownSession])).rowCount === 1, "A removed player's name could not be reused.");

    assert((await client.query("DELETE FROM public.rounds WHERE session_id = $1 RETURNING id", [ownSession])).rowCount === 2, "Reset did not remove both rounds.");
    await client.query("DELETE FROM public.teams WHERE session_id = $1", [ownSession]);
    assert((await client.query("SELECT id FROM public.matches WHERE session_id = $1", [ownSession])).rowCount === 0, "Reset left matches behind.");
    assert((await client.query("SELECT id FROM public.match_events WHERE session_id = $1", [ownSession])).rowCount === 0, "Reset left tracked events behind.");
    assert((await client.query("SELECT id FROM public.teams WHERE session_id = $1", [ownSession])).rowCount === 0, "Reset left generated teams behind.");
    assert((await client.query("SELECT id FROM public.players WHERE session_id = $1", [ownSession])).rowCount === 5, "Reset removed players.");
    assert((await client.query("INSERT INTO public.rounds (session_id, number) VALUES ($1, 1) RETURNING id", [ownSession])).rowCount === 1, "Round 1 could not be generated again after reset.");
    assert((await client.query("DELETE FROM public.sessions WHERE id = $1 RETURNING id", [ownSession])).rowCount === 1, "Owner cannot delete session.");
    for (const table of ["rounds", "matches", "teams"]) assert((await client.query(`SELECT id FROM public.${table} WHERE session_id = $1`, [ownSession])).rowCount === 0, `${table} did not cascade on session delete.`);
    console.log("Rounds, matches, scores, and events: ownership, correction, validation, isolation, and reset preservation verified.");
  }
} catch (error) {
  console.error("Match ownership check failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally {
  if (inTransaction) await client.query("ROLLBACK").catch(() => {});
  await client.end().catch(() => {});
}
