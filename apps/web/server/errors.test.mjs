import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../../../packages/common/src/errors.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ES2020,
  },
});
const { getAppError, AppError, AppErrorCode } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("authentication failures offer readable recovery instructions", () => {
  for (const input of [
    { code: "invalid_credentials" },
    new Error("Invalid login credentials"),
  ]) {
    assert.equal(
      getAppError(input).message,
      "The email or password is incorrect.",
    );
  }
  assert.match(
    getAppError({ code: "email_not_confirmed" }).message,
    /confirm your email address/,
  );
  assert.match(
    getAppError({ code: "over_request_rate_limit" }).message,
    /Wait a few minutes/,
  );
  assert.match(
    getAppError(new TypeError("Failed to fetch")).message,
    /Check your connection/,
  );
  assert.match(getAppError(new Error("JWT expired")).message, /log in again/);
});

test("unexpected backend details and malformed errors are safe to display", () => {
  for (const input of [
    null,
    undefined,
    { code: 123, message: {} },
    new Error(
      'duplicate key value violates unique constraint "users_private_index"',
    ),
  ]) {
    assert.equal(
      getAppError(input).message,
      "Something went wrong. Please try again.",
    );
  }
  assert.match(getAppError({ code: "PGRST205" }).message, /try again later/);
  assert.match(getAppError({ code: "42501" }).message, /Contact support/);
  assert.doesNotMatch(
    getAppError({ code: "PGRST205" }).message,
    /Supabase|migration|schema|PGRST/,
  );
});

test("explicit application messages preserve their intended recovery action", () => {
  const expected = new AppError(
    AppErrorCode.SessionExpired,
    "Sign in again to finish your upload.",
  );
  assert.equal(getAppError(expected), expected);
});
