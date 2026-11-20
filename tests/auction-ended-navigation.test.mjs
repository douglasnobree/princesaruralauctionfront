import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../components/Auction/AuctionRuntimeBoard.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function setup({ mode = "LIVE", hideClosedAuction = true } = {}) {
  const state = [];
  const effects = [];
  const sockets = [];
  const navigations = [];
  const router = { replace: (url) => navigations.push(url) };
  let cursor = 0;
  let poll;
  let snapshot = { auction: { status: "RUNNING", mode, currency: "BRL" }, lots: [], stream: null };
  const initialSnapshot = snapshot;
  const useState = (initial) => {
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
    return [state[index], (next) => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
  };
  const memo = (value, deps) => {
    const index = cursor++;
    if (!state[index] || deps.some((item, i) => item !== state[index].deps[i])) {
      state[index] = { value, deps };
      return true;
    }
    return false;
  };
  const react = {
    ...React, useState,
    useRef: (initial) => useState(() => ({ current: initial }))[0],
    useCallback: (callback, deps) => { const index = cursor; memo(callback, deps); return state[index].value; },
    useEffect: (effect, deps) => { if (memo(effect, deps)) effects.push(effect); },
  };
  const mocks = {
    react,
    "next/navigation": { useRouter: () => router },
    "@/hooks/actions/auctionEngineActions": {
      getEngineSnapshotAction: async () => ({ success: true, data: snapshot }),
      getAuctionRegistrationAction: async () => ({ success: true, data: null }),
      issueRealtimeTicketAction: async () => ({ success: true, data: { ticket: "test", auctionId: "test" } }),
    },
    "@/lib/auctions/bidder-display": { mergeKnownBidderNames: (_, next) => next },
    "@/lib/auctions/bid-window": { hasConfiguredPreBid: () => false, isPreBidOpen: () => false },
  };
  const loaded = { exports: {} };
  new Function("require", "exports", "window", "WebSocket", compiled)(
    (id) => mocks[id] ?? (id.startsWith("@/") || id.startsWith("./") ? {} : require(id)),
    loaded.exports,
    { setInterval: (callback) => { poll = callback; return 1; }, clearInterval() {}, setTimeout() {} },
    class { constructor() { sockets.push(this); } close() {} },
  );
  const render = () => {
    cursor = 0;
    loaded.exports.AuctionRuntimeBoard({ externalAuctionId: "test", initialSnapshot, hideClosedAuction });
    for (const effect of effects.splice(0)) effect();
  };
  return {
    navigations, sockets, render,
    async start() { render(); await Promise.resolve(); await Promise.resolve(); render(); },
    async pollStatus(status) {
      snapshot = { ...snapshot, auction: { ...snapshot.auction, status } };
      poll(); await Promise.resolve(); await Promise.resolve(); render();
    },
  };
}

test("polling redirects a finished live auction once, without redirecting on pause", async () => {
  const h = setup();
  await h.start();
  await h.pollStatus("PAUSED");
  assert.deepEqual(h.navigations, []);
  await h.pollStatus("FINISHED");
  await h.pollStatus("FINISHED");
  assert.deepEqual(h.navigations, ["/leiloes?aviso=leilao-encerrado"]);
});

test("the real auction.closed event redirects without waiting for polling", async () => {
  const h = setup();
  await h.start();
  h.sockets[0].onmessage({ data: JSON.stringify({ type: "event", event: { eventType: "auction.closed", payload: { status: "FINISHED" } } }) });
  h.render();
  assert.deepEqual(h.navigations, ["/leiloes?aviso=leilao-encerrado"]);
});

test("sandbox and other auction modes keep their existing navigation", async () => {
  for (const options of [{ hideClosedAuction: false }, { mode: "TIMED" }, { mode: "SHOPPING" }]) {
    const h = setup(options);
    await h.start();
    await h.pollStatus("FINISHED");
    assert.deepEqual(h.navigations, []);
  }
});

test("cancellation does not display the successful completion message", async () => {
  const h = setup();
  await h.start();
  await h.pollStatus("CANCELLED");
  assert.deepEqual(h.navigations, []);
});
