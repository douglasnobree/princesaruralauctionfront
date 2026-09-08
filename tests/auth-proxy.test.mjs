import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { AsyncLocalStorage } from "node:async_hooks";

globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
const { NextRequest } = await import("next/server.js");
const { default: nextTesting } = await import("next/experimental/testing/server.js");
const doesProxyMatch = nextTesting.unstable_doesProxyMatch ?? nextTesting.unstable_doesMiddlewareMatch;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      specifier = new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href;
    }
    if (specifier === "next/server") specifier = "next/server.js";
    return nextResolve(specifier, context);
  },
});

let backendStatus = 200;
let backendCalls = 0;
const accessToken = () => `e30.${Buffer.from(JSON.stringify({
  id: "000000000000000000000001",
  email: "controlled@example.invalid",
  accountType: "ADMIN",
  exp: Math.floor(Date.now() / 1000) + 300,
})).toString("base64url")}.synthetic`;

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  backendCalls += 1;
  return Response.json(
    backendStatus === 200
      ? { accessToken: accessToken(), refreshToken: "renewed-refresh" }
      : { message: "controlled failure" },
    { status: backendStatus },
  );
};
const { proxy, config } = await import("../proxy.ts");
globalThis.fetch = originalFetch;

function request(path, cookie = "", method = "GET") {
  return new NextRequest(`https://auction.example.invalid${path}`, {
    method,
    headers: cookie ? { cookie } : {},
  });
}

test("session renewal covers public pages and admin, excluding APIs and assets", () => {
  for (const url of ["/", "/leiloes", "/leiloes/fazenda/lotes/1", "/admin/leiloes"]) {
    assert.equal(doesProxyMatch({ config, nextConfig: {}, url }), true, url);
  }
  for (const url of ["/api/auth/refresh", "/api/auth/sso/callback", "/_next/static/chunk.js", "/brand/logo.svg", "/manifest.webmanifest"]) {
    assert.equal(doesProxyMatch({ config, nextConfig: {}, url }), false, url);
  }
});

test("anonymous visitors can browse public pages without being sent to login", async () => {
  const before = backendCalls;
  const response = await proxy(request("/leiloes"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.equal(backendCalls, before);
});

test("expired browser session is renewed and forwarded to the same page render", async () => {
  backendStatus = 200;
  // Browsers remove the short-lived session cookie when the access token expires.
  const response = await proxy(request("/leiloes", "refreshToken=valid-refresh"));
  assert.equal(response.status, 200);
  assert.ok(response.cookies.get("session")?.value);
  assert.equal(response.cookies.get("refreshToken")?.value, "renewed-refresh");
  const forwarded = response.headers.get("x-middleware-request-cookie");
  assert.match(forwarded, /session=/);
  assert.match(forwarded, /refreshToken=renewed-refresh/);
});

test("invalid refresh clears cookies but keeps public pages accessible", async () => {
  backendStatus = 401;
  const response = await proxy(request("/leiloes", "refreshToken=invalid-refresh"));
  assert.equal(response.status, 200);
  assert.equal(response.cookies.get("refreshToken")?.maxAge, 0);
});

test("admin still requires login and preserves the return destination", async () => {
  const response = await proxy(request("/admin/leiloes?status=LIVE"));
  const location = new URL(response.headers.get("location"));
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("returnTo"), "/admin/leiloes?status=LIVE");
});

test("temporary refresh failure does not fall through to an admin login redirect", async () => {
  backendStatus = 503;
  const response = await proxy(request("/admin/leiloes", "refreshToken=valid-refresh"));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("x-middleware-next"), null);
});
