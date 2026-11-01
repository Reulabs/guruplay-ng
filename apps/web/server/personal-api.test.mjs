import test from "node:test";
import assert from "node:assert/strict";
import { settingsPatch, checked } from "./personal-api.mjs";
test("account settings reject privilege fields, invalid playback settings and blank updates", () => {
  for (const payload of [
    { user_type: "admin" },
    { user_id: "another-user" },
    { account_status: "active" },
    { volume: 1.1 },
    { volume: -1 },
    { volume: NaN },
    { private_session: "false" },
    { display_name: "  " },
    {},
  ])
    assert.equal(settingsPatch.safeParse(payload).success, false);
  assert.deepEqual(
    settingsPatch.parse({
      display_name: "  Listener  ",
      private_session: true,
      volume: 0,
      autoplay: false,
    }),
    {
      display_name: "Listener",
      private_session: true,
      volume: 0,
      autoplay: false,
    },
  );
});
test("playlist and database failures preserve actionable HTTP statuses", () => {
  for (const [code, status] of [
    ["PT409", 409],
    ["P0002", 404],
    ["42501", 403],
    ["22023", 400],
    ["08006", 503],
  ])
    assert.throws(
      () => checked({ error: { code } }),
      (error) => error.status === status,
    );
  assert.deepEqual(checked({ data: [{ id: 1 }], error: null }), [{ id: 1 }]);
});
