import test from "node:test";
import assert from "node:assert/strict";
import { restoreApiUrl } from "./vercel-routing.mjs";
import { createHmac } from "node:crypto";
import handler from "../../../api/music.mjs";

test("nested API rewrites retain paths and query parameters", () => {
  assert.equal(
    restoreApiUrl("/api/music?__route=me/settings"),
    "/api/v1/me/settings",
  );
  assert.equal(
    restoreApiUrl("/api/music?__route=library/songs/123&source=library"),
    "/api/v1/library/songs/123?source=library",
  );
  assert.equal(
    restoreApiUrl(
      "/api/music?__route=billing/verify&reference=first&reference=last",
    ),
    "/api/v1/billing/verify?reference=first&reference=last",
  );
  assert.equal(
    restoreApiUrl("/api/v1/me/settings?__route=me/settings"),
    "/api/v1/me/settings",
  );
  assert.equal(restoreApiUrl("/api/v1/health"), "/api/v1/health");
});

test("the deployed adapter handles nested authenticated routes without a framework 404", async () => {
  const previous = { ...process.env };
  Object.assign(process.env, {
    VITE_SUPABASE_URL: "https://test.invalid",
    VITE_SUPABASE_ANON_KEY: "test-anon",
    SUPABASE_SERVICE_ROLE_KEY: "test-service",
  });
  try {
    for (const [route, method] of [
      ["me/settings", "GET"],
      ["library/songs/123", "PUT"],
    ]) {
      const res = {
        statusCode: 0,
        setHeader() {},
        end(body) {
          this.body = JSON.parse(body);
        },
      };
      await handler(
        { url: `/api/music?__route=${route}`, method, headers: {} },
        res,
      );
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.error, "Sign in to continue.");
    }
  } finally {
    for (const key of [
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ])
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
  }
});

test("webhook routing preserves the exact signed body before payload validation", async () => {
  const keys = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "PAYSTACK_SECRET_KEY",
  ];
  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, {
    VITE_SUPABASE_URL: "https://test.invalid",
    VITE_SUPABASE_ANON_KEY: "test-anon",
    SUPABASE_SERVICE_ROLE_KEY: "test-service",
    PAYSTACK_SECRET_KEY: "test-signing-key",
  });
  try {
    const rawBody = Buffer.from(' { "event": 123, "data": {} }\n');
    const signature = createHmac("sha512", "test-signing-key")
      .update(rawBody)
      .digest("hex");
    const res = {
      statusCode: 0,
      setHeader() {},
      end(body) {
        this.body = JSON.parse(body);
      },
    };
    await handler(
      {
        url: "/api/music?__route=webhooks/paystack",
        method: "POST",
        headers: { "x-paystack-signature": signature },
        rawBody,
      },
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, "Invalid webhook payload.");
  } finally {
    for (const key of keys)
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
  }
});
