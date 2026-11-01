import "../packages/common/server/env.mjs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

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
const checked = (result) => {
  if (result.error)
    throw new Error(
      `${result.error.code || "request"}: ${result.error.message}`,
    );
  return result.data;
};
const accounts = [];
const profiles = [];
const checks = [];
const marker = `guru-approval-${Date.now()}`;
const admin = client();
checked(
  await admin.auth.signInWithPassword({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  }),
);

try {
  for (const kind of ["listener", "pending", "artist"]) {
    const email = `${marker}-${kind}@example.test`,
      password = `T!${randomUUID()}x9`;
    const auth = checked(
      await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: `[TEST] ${kind}` },
      }),
    );
    const account = { id: auth.user.id, db: client(), kind };
    accounts.push(account);
    checked(
      await service
        .from("users")
        .upsert({
          id: account.id,
          email,
          display_name: `[TEST] ${kind}`,
          user_type: "user",
          account_status: "active",
        }),
    );
    checked(await account.db.auth.signInWithPassword({ email, password }));
    if (kind !== "listener") {
      const profile = checked(
        await account.db
          .from("artist_profiles")
          .insert({
            user_id: account.id,
            artist_name: `[TEST] ${marker} ${kind}`,
            bio: "Temporary permission verification.",
            genre: "Ambient",
            approval_status: "pending",
          })
          .select("id")
          .single(),
      );
      profiles.push(profile.id);
      account.profileId = profile.id;
    }
  }
  const pending = accounts.find((account) => account.kind === "pending");
  const artist = accounts.find((account) => account.kind === "artist");
  checked(
    await admin.rpc("review_artist_application", {
      profile_id: artist.profileId,
      next_status: "approved",
    }),
  );
  assert.equal(
    checked(
      await service
        .from("users")
        .select("user_type")
        .eq("id", artist.id)
        .single(),
    ).user_type,
    "artist",
  );
  checks.push(
    "Administrator can approve an artist and persist artist eligibility",
  );

  for (const actor of [{ kind: "anonymous", db: client() }, ...accounts]) {
    const denied = await actor.db.rpc("review_artist_application", {
      profile_id: pending.profileId,
      next_status: "approved",
    });
    assert.equal(
      denied.error?.code,
      "42501",
      `${actor.kind} approval must be denied`,
    );
    checks.push(
      `${actor.kind} cannot approve an artist through the review RPC`,
    );
  }
  for (const actor of accounts) {
    await actor.db
      .from("artist_profiles")
      .update({ approval_status: "approved" })
      .eq("id", pending.profileId)
      .select("id");
    assert.equal(
      checked(
        await service
          .from("artist_profiles")
          .select("approval_status")
          .eq("id", pending.profileId)
          .single(),
      ).approval_status,
      "pending",
    );
    await actor.db
      .from("users")
      .update({ user_type: "admin" })
      .eq("id", actor.id)
      .select("id");
    assert.notEqual(
      checked(
        await service
          .from("users")
          .select("user_type")
          .eq("id", actor.id)
          .single(),
      ).user_type,
      "admin",
    );
  }
  checks.push(
    "Listeners, pending artists and approved artists cannot bypass review or grant themselves admin access",
  );
  const visitor = client();
  assert.equal(
    checked(
      await visitor
        .from("artist_profiles")
        .select("id")
        .eq("id", pending.profileId),
    ).length,
    0,
  );
  checked(
    await admin.rpc("review_artist_application", {
      profile_id: pending.profileId,
      next_status: "approved",
    }),
  );
  assert.equal(
    checked(
      await visitor
        .from("artist_profiles")
        .select("id")
        .eq("id", pending.profileId),
    ).length,
    1,
  );
  checks.push(
    "Only an administrator approval makes the pending profile publicly visible",
  );
} finally {
  for (const id of profiles)
    checked(await service.from("artist_profiles").delete().eq("id", id));
  for (const account of accounts) {
    checked(await service.from("users").delete().eq("id", account.id));
    checked(await service.auth.admin.deleteUser(account.id));
  }
}

for (const account of accounts)
  assert.equal(
    checked(await service.from("users").select("id").eq("id", account.id))
      .length,
    0,
  );
for (const id of profiles)
  assert.equal(
    checked(await service.from("artist_profiles").select("id").eq("id", id))
      .length,
    0,
  );
const result = {
  testedAt: new Date().toISOString(),
  environment: "Configured shared Supabase backend",
  checks,
  cleanup: { temporaryUsersRemaining: 0, temporaryProfilesRemaining: 0 },
};
await writeFile(
  "docs/admin-artist-approval-status.json",
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(result));
