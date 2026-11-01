// Opt-in integration checks against the configured Supabase project and running app.
// All generated accounts and media are explicitly marked as temporary test fixtures.
import "../packages/common/server/env.mjs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import assert from "node:assert/strict";
const stateFile = "/tmp/guru-personal-e2e.json";
const service = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const client = () =>
  createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
const check = (r) => {
  if (r.error) throw r.error;
  return r.data;
};
async function login(email, password) {
  const db = client();
  const auth = check(await db.auth.signInWithPassword({ email, password }));
  return { db, token: auth.session.access_token, id: auth.user.id };
}
async function request(actor, path, method = "GET", body, expected = 200) {
  console.log("CHECK", method, path);
  const r = await fetch(`http://127.0.0.1:8080/api/v1/${path}`, {
    method,
    signal: AbortSignal.timeout(25000),
    headers: {
      ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await r.json();
  assert.equal(
    r.status,
    expected,
    `${method} ${path}: ${JSON.stringify(result)}`,
  );
  return result;
}
const mode = process.argv[2];
if (mode === "--setup") {
  try { await readFile(stateFile); throw new Error("A test run already exists. Complete --cleanup before creating another run."); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const marker = `guru-e2e-${Date.now()}`;
  const state = { marker, accounts: [], songIds: [], paths: [] };
  await writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
  for (const kind of ["listener", "other", "pending", "artist"]) {
    const email = `${marker}-${kind}@example.test`,
      password = `T!${randomUUID()}x9`;
    const auth = check(
      await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: `[TEST] ${kind}` },
      }),
    );
    state.accounts.push({ kind, email, password, id: auth.user.id });
    await writeFile(stateFile, JSON.stringify(state));
    check(
      await service
        .from("users")
        .upsert({
          id: auth.user.id,
          email,
          display_name: `[TEST] ${kind}`,
          user_type: ["artist", "pending"].includes(kind) ? "artist" : "user",
          account_status: "active",
        }),
    );
    if (["artist", "pending"].includes(kind))
      check(
        await service
          .from("artist_profiles")
          .insert({
            user_id: auth.user.id,
            artist_name: `[TEST] ${marker} ${kind}`,
            bio: "Temporary functional verification account.",
            genre: "Ambient",
            approval_status: kind === "artist" ? "approved" : "pending",
          }),
      );
  }
  const admin = await login(
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_PASSWORD,
  );
  state.adminId = admin.id;
  state.adminSettingsBefore = check(await service.from("user_settings").select("*").eq("user_id", admin.id).maybeSingle());
  await writeFile(stateFile, JSON.stringify(state));
  // Generated PCM audio is a real uploaded media fixture, not a fabricated catalog response.
  const seconds = 35,
    rate = 8000;
  const audio = Buffer.alloc(44 + seconds * rate * 2);
  audio.write("RIFF");
  audio.writeUInt32LE(audio.length - 8, 4);
  audio.write("WAVEfmt ", 8);
  audio.writeUInt32LE(16, 16);
  audio.writeUInt16LE(1, 20);
  audio.writeUInt16LE(1, 22);
  audio.writeUInt32LE(rate, 24);
  audio.writeUInt32LE(rate * 2, 28);
  audio.writeUInt16LE(2, 32);
  audio.writeUInt16LE(16, 34);
  audio.write("data", 36);
  audio.writeUInt32LE(audio.length - 44, 40);
  for (let i = 0; i < seconds * rate; i++)
    audio.writeInt16LE(
      Math.round(700 * Math.sin((2 * Math.PI * 220 * i) / rate)),
      44 + i * 2,
    );
  for (const name of ["Amber", "Blue"]) {
    const path = `${admin.id}/${marker}-${name}.wav`;
    check(
      await admin.db.storage
        .from("song-audio")
        .upload(path, audio, { contentType: "audio/wav" }),
    );
    state.paths.push(path);
    await writeFile(stateFile, JSON.stringify(state));
    const song = await request(
      admin,
      "media/songs/upload",
      "POST",
      {
        audioPath: path,
        title: `[TEST] ${name} library tone`,
        artist: "Guruplay E2E",
        genre: "Ambient",
      },
      202,
    );
    state.songIds.push(song.id);
    await writeFile(stateFile, JSON.stringify(state));
  }
  console.log(
    JSON.stringify({
      setup: true,
      accounts: state.accounts.length,
      songs: state.songIds.length,
      credentials: "stored in restricted temporary file",
    }),
  );
} else if (mode === "--verify") {
  const state = JSON.parse(await readFile(stateFile, "utf8"));
  const actors = {};
  for (const account of state.accounts)
    actors[account.kind] = await login(account.email, account.password);
  const { listener, other, pending, artist } = actors;
  const admin = await login(
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_PASSWORD,
  );
  const [a, b] = state.songIds;
  const receipts = [];
  const pass = (name) => {
    receipts.push(name);
    console.log("PASS", name);
  };
  const ready = check(
    await service.from("public_catalog").select("id").in("id", state.songIds),
  );
  assert.equal(
    ready.length,
    2,
    "Wait for the media worker to finish the real audio fixtures.",
  );
  await request(null, "library", "GET", undefined, 401);
  pass("anonymous personal data denied");
  for (const actor of [listener, pending, artist, admin])
    await request(actor, "me/settings");
  pass(
    "active listener, pending artist, approved artist and admin can load personal settings",
  );
  await request(listener, "me/settings", "PATCH", { user_type: "admin" }, 400);
  await request(listener, "me/settings", "PATCH", { volume: 2 }, 400);
  pass("settings reject privilege fields and invalid volume");
  await request(listener, "me/settings", "PATCH", {
    display_name: "[TEST] Library listener",
    volume: 0.25,
    autoplay: false,
    private_session: false,
  });
  assert.equal(
    (await request(listener, "me/settings")).preferences.volume,
    0.25,
  );
  pass("profile and playback settings persisted");
  await request(listener, `library/songs/${a}`, "PUT");
  await request(listener, `library/songs/${a}`, "PUT");
  assert.equal((await request(listener, "library")).saved.length, 1);
  assert.equal((await request(other, "library")).saved.length, 0);
  await request(listener, `library/songs/${a}`, "DELETE");
  assert.equal((await request(listener, "library")).saved.length, 0);
  pass("saved songs idempotent, persisted, isolated and removable");
  const playlist = (
    await request(listener, "playlists", "POST", {
      name: "[TEST] API playlist",
      description: "Temporary test playlist",
    })
  ).item;
  await request(listener, `playlists/${playlist.id}/songs/${a}`, "PUT");
  await request(listener, `playlists/${playlist.id}/songs/${a}`, "PUT");
  await request(listener, `playlists/${playlist.id}/songs/${b}`, "PUT");
  let detail = await request(listener, `playlists/${playlist.id}`);
  assert.deepEqual(detail.songIds, [a, b]);
  await request(listener, `playlists/${playlist.id}/order`, "PUT", {
    song_ids: [b, a],
    revision: detail.item.revision,
  });
  await request(
    listener,
    `playlists/${playlist.id}/order`,
    "PUT",
    { song_ids: [a, b], revision: detail.item.revision },
    409,
  );
  detail = await request(listener, `playlists/${playlist.id}`);
  assert.deepEqual(detail.songIds, [b, a]);
  await request(
    listener,
    `playlists/${playlist.id}/order`,
    "PUT",
    { song_ids: [a, a], revision: detail.item.revision },
    400,
  );
  pass("playlist order persisted; duplicates and stale revisions rejected");
  for (const method of ["GET", "PATCH", "DELETE"])
    await request(
      other,
      `playlists/${playlist.id}`,
      method,
      method === "PATCH" ? { name: "stolen" } : undefined,
      404,
    );
  await request(
    other,
    `playlists/${playlist.id}/songs/${a}`,
    "PUT",
    undefined,
    404,
  );
  assert.equal(
    check(await other.db.from("playlists").select("*").eq("id", playlist.id))
      .length,
    0,
  );
  assert.equal(
    check(
      await other.db
        .from("playlist_songs")
        .select("*")
        .eq("playlist_id", playlist.id),
    ).length,
    0,
  );
  const rpc = await other.db.rpc("mutate_playlist", {
    target: playlist.id,
    action: "add",
    song: a,
  });
  assert.equal(rpc.error?.code, "P0002");
  pass(
    "cross-account reads, edits, delete, membership RPC and direct RLS denied",
  );
  // Removing a song from publication immediately removes it from personal catalog views.
  check(
    await service
      .from("songs")
      .update({ approval_status: "pending" })
      .eq("id", b),
  );
  assert.equal(
    (await request(listener, `playlists/${playlist.id}`)).tracks.length,
    1,
  );
  await request(listener, `library/songs/${b}`, "PUT", undefined, 404);
  await request(
    listener,
    `playlists/${playlist.id}/songs/${b}`,
    "PUT",
    undefined,
    404,
  );
  check(
    await service
      .from("songs")
      .update({ approval_status: "approved" })
      .eq("id", b),
  );
  pass("unpublished tracks hidden and cannot be saved or added");
  await request(listener, `playlists/${playlist.id}`, "PATCH", {
    name: "[TEST] Renamed playlist",
    description: "Saved edit",
  });
  await request(listener, `playlists/${playlist.id}/songs/${a}`, "DELETE");
  assert.deepEqual(
    (await request(listener, `playlists/${playlist.id}`)).songIds,
    [b],
  );
  await request(listener, `playlists/${playlist.id}`, "DELETE");
  await request(listener, `playlists/${playlist.id}`, "GET", undefined, 404);
  pass("playlist edit, remove song and delete persisted");
  const event = () => ({
    events: [
      {
        eventId: randomUUID(),
        songId: a,
        eventType: "preview_start",
        positionSeconds: 0,
        clientOccurredAt: new Date().toISOString(),
      },
    ],
  });
  await request(listener, "playback/events", "POST", event(), 202);
  assert.ok(
    (await request(listener, "library")).history.some(
      (track) => track.id === a,
    ),
  );
  await request(listener, "me/settings", "PATCH", { private_session: true });
  const count = check(
    await service
      .from("playback_events")
      .select("event_id")
      .eq("user_id", listener.id),
  ).length;
  assert.equal(
    (await request(listener, "playback/events", "POST", event(), 202)).accepted,
    0,
  );
  assert.equal(
    check(
      await service
        .from("playback_events")
        .select("event_id")
        .eq("user_id", listener.id),
    ).length,
    count,
  );
  await request(listener, "recommendations");
  await request(listener, "library/history", "DELETE");
  assert.equal((await request(listener, "library")).history.length, 0);
  await request(listener, "me/settings", "PATCH", { private_session: false });
  pass(
    "listening history, server-enforced private session, recommendations and history clearing",
  );
  const ticket = (
    await request(listener, "support", "POST", {
      subject: "[TEST] Library support",
      message: "Temporary request to verify support persistence.",
    })
  ).item;
  assert.equal((await request(other, "support")).items.length, 0);
  await request(listener, "support/admin", "GET", undefined, 403);
  await request(admin, `support/admin/${ticket.id}`, "PATCH", {
    response: "[TEST] Your library issue is resolved.",
    status: "resolved",
  });
  assert.equal(
    (await request(listener, "support")).items[0].response,
    "[TEST] Your library issue is resolved.",
  );
  pass("support request, admin response and owner isolation");
  await request(listener, `admin/songs/${a}/preview`, "GET", undefined, 403);
  const preview = await request(admin, `admin/songs/${a}/preview`);
  assert.ok(preview.url);
  pass("only admin receives review audio");
  check(
    await service
      .from("users")
      .update({ account_status: "paused" })
      .eq("id", other.id),
  );
  await request(other, "library", "GET", undefined, 403);
  assert.ok(
    (
      await other.db
        .from("playlists")
        .insert({ user_id: other.id, name: "blocked" })
    ).error,
  );
  check(
    await service
      .from("users")
      .update({ account_status: "active" })
      .eq("id", other.id),
  );
  pass("paused account API and direct database writes denied");
  const denied = await artist.db.rpc("review_song", {
    target_song_id: a,
    next_status: "approved",
    reason: null,
  });
  assert.ok(denied.error);
  pass("approved artist cannot moderate");
  await writeFile(
    "docs/personal-e2e-status.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        project: "fuquclbwwofwugkxirrl",
        environment: "local app with real Supabase",
        checks: receipts,
      },
      null,
      2,
    ) + "\n",
  );
} else if (mode === "--cleanup") {
  const state = JSON.parse(await readFile(stateFile, "utf8"));
  if (state.adminId) {
    if (state.adminSettingsBefore) check(await service.from("user_settings").upsert(state.adminSettingsBefore));
    else check(await service.from("user_settings").delete().eq("user_id", state.adminId));
  }
  for (const songId of state.songIds) {
    const asset = check(
      await service
        .from("song_assets")
        .select("full_object_path,preview_object_path")
        .eq("song_id", songId)
        .maybeSingle(),
    );
    check(await service.from("songs").delete().eq("id", songId));
    if (asset?.full_object_path)
      check(
        await service.storage
          .from("song-audio")
          .remove([asset.full_object_path]),
      );
    if (asset?.preview_object_path)
      check(
        await service.storage
          .from("song-previews")
          .remove([asset.preview_object_path]),
      );
  }
  if (state.paths.length)
    check(await service.storage.from("song-audio").remove(state.paths));
  for (const account of state.accounts) {
    check(await service.from("users").delete().eq("id", account.id));
    check(await service.auth.admin.deleteUser(account.id));
  }
  await unlink(stateFile);
  console.log(
    "Removed only this run’s temporary users, playlists, saved songs, tickets and media.",
  );
} else
  throw new Error(
    "Use --setup, --verify or --cleanup. Requires the configured test environment and running web app.",
  );
