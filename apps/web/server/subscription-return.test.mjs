import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../../../packages/common/src/subscription.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ES2020,
  },
});
const { checkoutReference, resolveSubscriptionReturn } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const inactive = {
  entitled: false,
  status: "inactive",
  paidThrough: null,
  graceEndsAt: null,
};
const active = {
  entitled: true,
  status: "active",
  paidThrough: "2026-11-30T00:00:00Z",
  graceEndsAt: "2026-12-01T00:00:00Z",
};

test("callback parsing supports provider references and rejects malformed links", () => {
  assert.equal(
    checkoutReference(
      new URLSearchParams("reference=old&reference=actual&trxref=actual"),
    ),
    "actual",
  );
  assert.equal(
    checkoutReference(new URLSearchParams("trxref=actual")),
    "actual",
  );
  assert.equal(
    checkoutReference(new URLSearchParams("reference=&trxref=actual")),
    "actual",
  );
  for (const query of [
    "",
    "reference=%3Cscript%3E",
    `reference=${"a".repeat(101)}`,
  ])
    assert.equal(checkoutReference(new URLSearchParams(query)), null);
});

test("an already subscribed account cannot silently claim another account’s callback", async () => {
  for (const reference of ["missing-checkout", null]) {
    let verified = false;
    const result = await resolveSubscriptionReturn({
      reference,
      readStatus: async () => active,
      verify: async () => {
        verified = true;
        throw new Error("Checkout not found");
      },
    });
    assert.equal(result.subscription.entitled, true);
    assert.ok(result.message);
    assert.equal(verified, reference !== null);
  }
});

test("a return URL and a successful verify response cannot grant premium without server entitlement", async () => {
  const result = await resolveSubscriptionReturn({
    reference: "untrusted-reference",
    readStatus: async () => inactive,
    verify: async () => undefined,
  });
  assert.equal(result.subscription.entitled, false);
  assert.match(result.message, /still being confirmed/);
  const incomplete = await resolveSubscriptionReturn({
    reference: null,
    readStatus: async () => inactive,
    verify: async () => assert.fail("must not verify an incomplete link"),
  });
  assert.equal(incomplete.subscription.entitled, false);
  assert.match(incomplete.message, /incomplete/);
});

test("payment confirmation refreshes access while failed reference verification remains actionable", async () => {
  for (const fails of [false, true]) {
    let reads = 0;
    const result = await resolveSubscriptionReturn({
      reference: "owned-reference",
      readStatus: async () => (++reads === 1 ? inactive : active),
      verify: async () => {
        if (fails) throw new Error("Subscription is still being confirmed");
      },
    });
    assert.equal(result.subscription.entitled, true);
    if (fails) assert.match(result.message, /still being confirmed/);
    else assert.equal(result.message, null);
  }
});

test("a verified callback for an existing subscriber can return to the dashboard", async () => {
  const result = await resolveSubscriptionReturn({
    reference: "owned-verified-reference",
    readStatus: async () => active,
    verify: async () => undefined,
  });
  assert.equal(result.subscription.entitled, true);
  assert.equal(result.message, null);
});

test("an unpaid account retains its recovery message and service failures never become active access", async () => {
  const result = await resolveSubscriptionReturn({
    reference: "another-account",
    readStatus: async () => inactive,
    verify: async () => {
      throw new Error("Sign in with the account used at checkout.");
    },
  });
  assert.equal(result.subscription.entitled, false);
  assert.match(result.message, /account used at checkout/);
  await assert.rejects(
    resolveSubscriptionReturn({
      reference: "any",
      readStatus: async () => {
        throw new Error("Subscription service unavailable");
      },
      verify: async () =>
        assert.fail("must not verify when subscription status is unavailable"),
    }),
    /unavailable/,
  );
});
