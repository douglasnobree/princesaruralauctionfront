import assert from "node:assert/strict";
import test from "node:test";
import { safeGoogleReturnTo, validGoogleCsrf } from "../lib/auth/google-callback.ts";

test("Google redirect requires matching CSRF cookie and submitted value", () => {
  assert.equal(validGoogleCsrf("same-token", "same-token"), true);
  assert.equal(validGoogleCsrf("same-token", "other-token"), false);
  assert.equal(validGoogleCsrf(undefined, "same-token"), false);
  assert.equal(validGoogleCsrf("same-token", null), false);
  assert.equal(validGoogleCsrf("a", "é"), false);
});

test("Google return path stays on this site", () => {
  assert.equal(safeGoogleReturnTo("/leiloes?tipo=mercado", "/leiloes"), "/leiloes?tipo=mercado");
  assert.equal(safeGoogleReturnTo("//other.example", "/leiloes"), "/leiloes");
  assert.equal(safeGoogleReturnTo("/\\other.example", "/leiloes"), "/leiloes");
  assert.equal(safeGoogleReturnTo("https://other.example", "/leiloes"), "/leiloes");
});
