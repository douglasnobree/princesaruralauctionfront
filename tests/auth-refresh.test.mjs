import assert from "node:assert/strict";
import test from "node:test";
import { createAuthenticatedRequester } from "../lib/auth/server/authenticated-request.ts";
import { createRefreshCoordinator } from "../lib/auth/server/refresh-coordinator.ts";

const NOW = 2_000_000_000_000;

function syntheticAccessToken(expiresAt = NOW + 5 * 60_000) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    id: "000000000000000000000001",
    email: "controlled@example.invalid",
    accountType: "ADMIN",
    roles: ["ADMIN"],
    exp: Math.floor(expiresAt / 1000),
  })}.synthetic`;
}

function session(accessToken, expiresAt) {
  return { accessToken, expiresAt };
}

test("single-flight deduplicates simultaneous refresh requests", async () => {
  let backendCalls = 0;
  const coordinator = createRefreshCoordinator(async () => {
    backendCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 25));
    return Response.json({
      accessToken: syntheticAccessToken(),
      refreshToken: "rotated-controlled-token",
    });
  });

  const results = await Promise.all(
    Array.from({ length: 8 }, () => coordinator({
      endpoint: "http://controlled.invalid/api/auth/refresh",
      refreshToken: "controlled-refresh-token",
    })),
  );

  assert.equal(backendCalls, 1);
  assert.ok(results.every((result) => result.status === "success"));
});

test("refresh coordinator distinguishes invalid and unavailable responses", async () => {
  const invalid = createRefreshCoordinator(async () =>
    Response.json({ message: "invalid" }, { status: 401 }),
  );
  const unavailable = createRefreshCoordinator(async () =>
    Response.json({ message: "offline" }, { status: 503 }),
  );

  assert.deepEqual(
    await invalid({ endpoint: "http://controlled.invalid/refresh", refreshToken: "invalid" }),
    { status: "invalid" },
  );
  assert.deepEqual(
    await unavailable({ endpoint: "http://controlled.invalid/refresh", refreshToken: "valid" }),
    { status: "unavailable" },
  );
});

test("valid access token is used without refresh", async () => {
  let refreshCalls = 0;
  let clearCalls = 0;
  const current = session("valid-access", NOW + 5 * 60_000);
  const request = createAuthenticatedRequester({
    getSession: async () => current,
    refreshSession: async () => {
      refreshCalls += 1;
      return { status: "unavailable", session: null };
    },
    clearSession: async () => { clearCalls += 1; },
    fetch: async (_input, init) => {
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer valid-access");
      return Response.json({ ok: true });
    },
    now: () => NOW,
  });

  const response = await request("http://controlled.invalid/protected");
  assert.equal(response.status, 200);
  assert.equal(refreshCalls, 0);
  assert.equal(clearCalls, 0);
});

test("expired access token refreshes before the protected request", async () => {
  let refreshCalls = 0;
  const renewed = session("renewed-access", NOW + 5 * 60_000);
  const request = createAuthenticatedRequester({
    getSession: async () => session("expired-access", NOW - 1),
    refreshSession: async () => {
      refreshCalls += 1;
      return { status: "success", session: renewed };
    },
    clearSession: async () => assert.fail("session should stay active"),
    fetch: async (_input, init) => {
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer renewed-access");
      return Response.json({ ok: true });
    },
    now: () => NOW,
  });

  assert.equal((await request("http://controlled.invalid/protected")).status, 200);
  assert.equal(refreshCalls, 1);
});

test("invalid refresh ends the local session without calling the protected endpoint", async () => {
  let protectedCalls = 0;
  let clearCalls = 0;
  const request = createAuthenticatedRequester({
    getSession: async () => session("expired-access", NOW - 1),
    refreshSession: async () => ({ status: "invalid", session: null }),
    clearSession: async () => { clearCalls += 1; },
    fetch: async () => {
      protectedCalls += 1;
      return Response.json({ ok: true });
    },
    now: () => NOW,
  });

  const response = await request("http://controlled.invalid/protected");
  assert.equal(response.status, 401);
  assert.equal(protectedCalls, 0);
  assert.equal(clearCalls, 1);
});

test("a backend 401 refreshes and retries the original request only once", async () => {
  let protectedCalls = 0;
  let refreshCalls = 0;
  let clearCalls = 0;
  const request = createAuthenticatedRequester({
    getSession: async () => session("current-access", NOW + 5 * 60_000),
    refreshSession: async () => {
      refreshCalls += 1;
      return {
        status: "success",
        session: session("renewed-access", NOW + 5 * 60_000),
      };
    },
    clearSession: async () => { clearCalls += 1; },
    fetch: async () => {
      protectedCalls += 1;
      return Response.json({ code: "UNAUTHORIZED" }, { status: 401 });
    },
    now: () => NOW,
  });

  const response = await request("http://controlled.invalid/protected");
  assert.equal(response.status, 401);
  assert.equal(protectedCalls, 2);
  assert.equal(refreshCalls, 1);
  assert.equal(clearCalls, 1);
});

test("simultaneous expired requests share one backend refresh", async () => {
  let backendRefreshCalls = 0;
  let current = session("expired-access", NOW - 1);
  const coordinator = createRefreshCoordinator(async () => {
    backendRefreshCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 25));
    return Response.json({ accessToken: syntheticAccessToken() });
  });
  const request = createAuthenticatedRequester({
    getSession: async () => current,
    refreshSession: async () => {
      const result = await coordinator({
        endpoint: "http://controlled.invalid/api/auth/refresh",
        refreshToken: "controlled-refresh-token",
      });
      if (result.status !== "success") return { ...result, session: null };
      current = session(result.accessToken, NOW + 5 * 60_000);
      return { status: "success", session: current };
    },
    clearSession: async () => assert.fail("session should stay active"),
    fetch: async () => Response.json({ ok: true }),
    now: () => NOW,
  });

  const responses = await Promise.all(
    Array.from({ length: 8 }, () => request("http://controlled.invalid/protected")),
  );
  assert.equal(backendRefreshCalls, 1);
  assert.ok(responses.every((response) => response.status === 200));
});

test("optional requests remain anonymous when there is no session", async () => {
  let authorization;
  const request = createAuthenticatedRequester({
    getSession: async () => null,
    refreshSession: async () => ({ status: "missing", session: null }),
    clearSession: async () => assert.fail("nothing should be cleared"),
    fetch: async (_input, init) => {
      authorization = new Headers(init?.headers).get("authorization");
      return Response.json({ public: true });
    },
    now: () => NOW,
  });

  const response = await request(
    "http://controlled.invalid/optional",
    {},
    { auth: "optional" },
  );
  assert.equal(response.status, 200);
  assert.equal(authorization, null);
});
