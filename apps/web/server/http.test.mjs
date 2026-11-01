import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../../../packages/common/src/http.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ES2020,
  },
});
const { readApiResponse, feedbackMessage } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("plain-text deployment failures and invalid successful responses never expose parsing errors", async () => {
  for (const response of [
    new Response("The page could not be found\nNOT_FOUND", { status: 404 }),
    new Response("<html>Service unavailable</html>", { status: 502 }),
    new Response("not json", { status: 200 }),
    new Response("null", { status: 200 }),
  ])
    await assert.rejects(readApiResponse(response), {
      message: "We couldn’t complete this request. Please try again shortly.",
    });
});

test("request failures offer an appropriate recovery action without server details", async () => {
  const response = (status, error) =>
    new Response(JSON.stringify({ error }), { status });
  await assert.rejects(
    readApiResponse(response(503, "The trusted music API is not configured.")),
    /try again shortly/,
  );
  await assert.rejects(
    readApiResponse(response(401, "JWT failed")),
    /sign in again/,
  );
  await assert.rejects(
    readApiResponse(response(429, "limit")),
    /Wait a moment/,
  );
  await assert.rejects(
    readApiResponse(
      response(409, "This playlist changed. Refresh and try again."),
    ),
    /playlist changed/,
  );
  assert.deepEqual(
    await readApiResponse(new Response(JSON.stringify({ saved: true }))),
    { saved: true },
  );
});

test("feedback hides technical messages but preserves clear user instructions", () => {
  for (const message of [
    "Unexpected token T in JSON",
    "The trusted music API is not configured.",
    "<html>Error</html>",
    "PGRST205",
    undefined,
  ])
    assert.equal(
      feedbackMessage(message),
      "We couldn’t load this right now. Please try again shortly.",
    );
  assert.equal(
    feedbackMessage("This song is unavailable."),
    "This song is unavailable.",
  );
});
