import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, mocks = {}, extraSource = "", browser = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8") + extraSource;
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", "window", "document", "WebSocket", compiled)(
    (id) => mocks[id] ?? (id.startsWith("@/") ? {} : require(id)), loaded, loaded.exports, browser, { hidden: false }, browser.WebSocket,
  );
  return loaded.exports;
}
const formatters = load("lib/auctions/engine-formatters.ts");
const operationState = load("lib/auctions/operation-state.ts", { "./engine-formatters": formatters });
const participant = { id: "participant-1", displayName: "Ana", participantType: "QUICK" };
const initialLot = {
  id: "engine-lot-1", externalId: "lot-1", lotNumber: 1, title: "Lote de teste", status: "OPEN",
  startingBidCents: "10000", currentPriceCents: "10000", nextBidCents: "12000",
  incrementCents: "2000", currentIncrementCents: "2000", secondaryIncrementCents: "3000",
  currentBidderAlias: null, currentBidderName: null, lotSequence: "1", version: "2", endsAt: null,
};
const snapshot = (lot = initialLot) => ({
  auction: { id: "engine-auction-1", externalId: "auction-1", mode: "LIVE", status: "RUNNING", version: "1", currency: "BRL" },
  stream: null, lots: [lot], serverTime: "2026-10-16T12:00:00Z",
});
const advancedLot = { ...initialLot, currentPriceCents: "12000", nextBidCents: "15000", currentIncrementCents: "3000", lotSequence: "2", version: "3" };
const bidResult = (lot) => ({ ...lot, lotId: lot.id, status: "ACCEPTED", serverTime: "2026-10-16T12:00:01Z" });

function find(node, predicate) {
  if (!React.isValidElement(node)) return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props.children)) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}
const byId = (tree, id) => find(tree, (node) => typeof node.type === "string" && node.props.id === id);

function setup({ read = async () => snapshot(), response } = {}) {
  const values = [];
  const tasks = [];
  const effects = [];
  const calls = [];
  const results = [];
  let cursor = 0;
  const useState = (initial) => {
    const index = cursor++;
    if (!(index in values)) values[index] = typeof initial === "function" ? initial() : initial;
    return [values[index], (next) => { values[index] = typeof next === "function" ? next(values[index]) : next; }];
  };
  const react = {
    ...React, useState,
    useRef: (current) => useState(() => ({ current }))[0],
    useTransition: () => [false, (callback) => tasks.push(callback())],
    useEffect: (callback, deps) => {
      const index = cursor++;
      if (!values[index] || deps.some((value, i) => value !== values[index][i])) {
        values[index] = deps;
        effects.push(callback);
      }
    },
  };
  const { FloorBidPanel } = load("components/Management/AuctionOperationPanel.tsx", {
    react,
    "@/lib/auctions/engine-formatters": formatters,
    "@/lib/auctions/operation-state": operationState,
    "@/lib/auctions/acquisition-sources": { acquisitionSourceOptions: [] },
    "@/hooks/actions/auctionEngineActions": {
      searchAuctionParticipantsAction: async () => ({ success: true, data: [participant] }),
      createQuickParticipantAction: async () => ({ success: true, data: participant }),
      managerFloorBidAction: async (...args) => {
        calls.push(args);
        return response ?? { success: true, data: bidResult(advancedLot) };
      },
    },
  }, "\nexport { FloorBidPanel };", {
    setTimeout: (callback) => { tasks.push(Promise.resolve().then(callback)); return 1; },
    clearTimeout() {},
  });
  const props = {
    auctionId: "auction-1", snapshot: snapshot(), selectedLot: initialLot, disabled: false,
    onRefresh: read, onResult: (...args) => results.push(args), onRecoveryPendingChange() {},
  };
  return {
    props, calls, results,
    render() { cursor = 0; return FloorBidPanel(props); },
    async settle() {
      for (const effect of effects.splice(0)) effect();
      while (tasks.length) await Promise.all(tasks.splice(0));
    },
  };
}
async function chooseParticipant(h) {
  byId(h.render(), "floor-participant").props.onChange({ target: { value: "Ana" } });
  h.render();
  await h.settle();
  find(h.render(), (node) => node.props.role === "option").props.onClick();
  await h.settle();
}
function submit(h) {
  find(h.render(), (node) => node.type === "form").props.onSubmit({ preventDefault() {} });
}

test("selecting another participant resets a previous higher value to the next bid", async () => {
  const h = setup();
  await chooseParticipant(h);
  byId(h.render(), "floor-amount").props.onChange({ target: { value: "16000" } });
  assert.equal(byId(h.render(), "floor-amount").props.value, "16000");
  await chooseParticipant(h);
  assert.equal(byId(h.render(), "floor-amount").props.value, initialLot.nextBidCents);
});

test("submission follows the latest next bid and alternating increment without waiting for polling", async () => {
  const h = setup({ read: async () => snapshot(advancedLot) });
  await chooseParticipant(h);
  submit(h);
  await h.settle();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0].slice(0, 3), ["auction-1", "lot-1", {
    participantId: participant.id, amountCents: "15000", origin: "FLOOR", acquisitionSource: "UNKNOWN", expectedVersion: "3",
  }]);
});

test("an explicit higher bid is preserved while the official next bid is unchanged", async () => {
  const h = setup();
  await chooseParticipant(h);
  byId(h.render(), "floor-amount").props.onChange({ target: { value: "16000" } });
  submit(h);
  await h.settle();
  assert.equal(h.calls[0][2].amountCents, "16000");
});

test("the displayed amount follows live changes while keeping the participant selected", async () => {
  const h = setup();
  await chooseParticipant(h);
  byId(h.render(), "floor-amount").props.onChange({ target: { value: "16000" } });
  h.props.selectedLot = advancedLot;
  h.props.snapshot = snapshot(advancedLot);
  const tree = h.render();
  assert.equal(byId(tree, "floor-participant").props.value, participant.displayName);
  const amount = byId(tree, "floor-amount");
  assert.equal(amount.props.value, "15000");
  assert.deepEqual(React.Children.toArray(amount.props.children).map((option) => option.props.value), ["15000", "18000", "21000", "24000"]);
});

test("a closed lot or failed refresh prevents a stale floor bid", async () => {
  for (const latest of [null, snapshot({ ...advancedLot, status: "SOLD" })]) {
    const h = setup({ read: async () => latest });
    await chooseParticipant(h);
    submit(h);
    await h.settle();
    assert.equal(h.calls.length, 0);
  }
});

test("an unconfirmed bid is retried with the original amount, version and idempotency key", async () => {
  const h = setup({ response: { success: false, outcomeUnknown: true, error: "Resposta não confirmada" } });
  await chooseParticipant(h);
  submit(h);
  await h.settle();
  const retry = find(h.render(), (node) => node.type === "button" && React.Children.toArray(node.props.children).includes("Confirmar resultado do mesmo lance"));
  assert.ok(retry);
  retry.props.onClick();
  await h.settle();
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.calls[1], h.calls[0]);
});

test("a delayed snapshot cannot roll back an accepted bid or a newer increment", () => {
  const current = snapshot(advancedLot);
  assert.equal(operationState.mergeOperationSnapshot(current, snapshot()), current);
  const newer = snapshot({ ...advancedLot, version: "4", nextBidCents: "17000", currentIncrementCents: "2000" });
  assert.equal(operationState.mergeOperationSnapshot(current, newer).lots[0], newer.lots[0]);
});

test("lot versions are compared as integers and stale prices can still be corrected by a newer version", () => {
  const current = snapshot({ ...advancedLot, version: "10" });
  assert.equal(operationState.mergeOperationSnapshot(current, snapshot({ ...initialLot, version: "9" })), current);
  const correction = snapshot({ ...initialLot, version: "11" });
  assert.equal(operationState.mergeOperationSnapshot(current, correction).lots[0].nextBidCents, "12000");
});

function setupOperation(read) {
  const values = [];
  const effects = [];
  const cleanups = [];
  const sockets = [];
  let cursor = 0;
  const useState = (initial) => {
    const index = cursor++;
    if (!(index in values)) values[index] = typeof initial === "function" ? initial() : initial;
    return [values[index], (next) => { values[index] = typeof next === "function" ? next(values[index]) : next; }];
  };
  const react = {
    ...React, useState,
    useRef: (current) => useState(() => ({ current }))[0],
    useTransition: () => [false, (callback) => callback()],
    useEffectEvent: (callback) => {
      const [ref] = useState(() => ({ current: callback }));
      ref.current = callback;
      return (...args) => ref.current(...args);
    },
    useEffect: (callback, deps) => {
      const index = cursor++;
      if (!values[index] || deps.some((value, i) => value !== values[index][i])) {
        values[index] = deps;
        effects.push(callback);
      }
    },
  };
  const { AuctionOperationPanel } = load("components/Management/AuctionOperationPanel.tsx", {
    react,
    "@/lib/auctions/operation-state": operationState,
    "@/lib/auctions/manager-read": { managerRead: read },
    "@/hooks/use-visible-poll": { useVisiblePoll() {} },
    "@/hooks/actions/auctionEngineActions": {
      issueRealtimeTicketAction: async () => ({ success: true, data: { ticket: "test-ticket", auctionId: "engine-auction-1" } }),
    },
  }, "", {
    WebSocket: class {
      constructor(url) { this.url = url; sockets.push(this); }
      close() { this.onclose?.(); }
    },
  });
  return {
    sockets,
    render() {
      cursor = 0;
      return AuctionOperationPanel({ auctionId: "auction-1", initialSnapshot: snapshot(), capabilities: { canManageStatus: true, canManageBids: true } });
    },
    floorProps() { return find(this.render(), (node) => node.type?.name === "FloorBidPanel").props; },
    async settle() {
      for (const effect of effects.splice(0)) {
        const cleanup = effect();
        if (cleanup) cleanups.push(cleanup);
      }
      await new Promise((resolve) => setImmediate(resolve));
    },
    close() { for (const cleanup of cleanups) cleanup(); },
  };
}

test("the operation panel follows an engine event before the next polling interval", async () => {
  const h = setupOperation(async () => snapshot(advancedLot));
  assert.equal(h.floorProps().selectedLot.nextBidCents, "12000");
  await h.settle();
  try {
    assert.equal(h.sockets.length, 1);
    assert.match(h.sockets[0].url, /ticket=test-ticket&auctionId=engine-auction-1/);
    h.sockets[0].onmessage({ data: JSON.stringify({ type: "event", event: { eventType: "bid.accepted" } }) });
    await h.settle();
    assert.equal(h.floorProps().selectedLot.nextBidCents, "15000");
  } finally { h.close(); }
});

test("polling responses started before and after acceptance cannot overwrite the confirmed next bid", async () => {
  const reads = [];
  const h = setupOperation(() => new Promise((resolve) => reads.push(resolve)));
  const pendingRead = h.floorProps().onRefresh();
  h.floorProps().onResult(initialLot.externalId, bidResult(advancedLot));
  assert.equal(h.floorProps().selectedLot.nextBidCents, "15000");
  reads[0](snapshot());
  await pendingRead;
  reads[1](snapshot());
  await h.settle();
  try {
    assert.equal(h.floorProps().selectedLot.nextBidCents, "15000");
    assert.equal(h.floorProps().selectedLot.version, "3");
  } finally { h.close(); }
});
