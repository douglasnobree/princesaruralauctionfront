import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";
import React from "react";

const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  const localRequire = (id) => mocks[id] ?? (id.startsWith("@/") ? {} : require(id));
  new Function("require", "module", "exports", compiled)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}
const utils = load("lib/auctions/admin-utils.ts");
const auction = { id: "auction-1", title: "Shopping", slug: "shopping", mode: "TIMED", startsAt: "2099-01-01T12:00:00Z", endsAt: "2099-01-01T18:00:00Z" };

function harness(path, exportName, props, actions = {}) {
  const values = [];
  const pending = [];
  let cursor = 0;
  const useState = (initial) => {
    const index = cursor++;
    if (!(index in values)) values[index] = typeof initial === "function" ? initial() : initial;
    return [values[index], (next) => { values[index] = typeof next === "function" ? next(values[index]) : next; }];
  };
  const component = load(path, {
    react: { ...React, useState, useRef: (current) => useState(() => ({ current }))[0], useEffect() {}, useMemo: (callback) => callback(), useTransition: () => [false, (callback) => pending.push(callback())] },
    "next/navigation": { useRouter: () => ({ refresh() {}, replace() {} }) },
    "@/lib/auctions/admin-utils": utils,
    "@/lib/auctions/form-mappers": { slugifyAuction: (value) => value },
    "@/hooks/actions/auctionActions": actions,
    "./AuctionBannerField": { AuctionBannerField: () => null },
  })[exportName];
  return { render: () => { cursor = 0; return component(props); }, settle: () => Promise.all(pending) };
}
function find(node, predicate) {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}
const byId = (tree, id) => find(tree, (node) => typeof node.type === "string" && node.props?.id === id);
const submit = (tree) => find(tree, (node) => node.type === "form").props.onSubmit({ preventDefault() {} });

test("Shopping exposes the auction closing and sends it with the Brasília offset", async () => {
  const saved = [];
  const h = harness("components/Management/AuctionForm.tsx", "AuctionForm", { initialData: auction, capabilities: { canEdit: true } }, {
    updateAuctionAction: async (id, input) => { saved.push(input); return { success: true, data: auction }; },
  });
  const field = byId(h.render(), "auction-ends-timed");
  assert.equal(field.props.value, "2099-01-01T15:00");
  assert.equal(field.props.required, true);
  assert.equal(field.props["aria-describedby"], "auction-ends-timed-help");
  field.props.onChange({ target: { value: "2099-01-01T17:00" } });
  submit(h.render());
  await h.settle();
  assert.equal(saved[0].endsAt, "2099-01-01T17:00:00-03:00");
});

test("new Shopping auctions save the configured auction closing", async () => {
  let saved;
  const h = harness("components/Management/AuctionForm.tsx", "AuctionForm", { capabilities: { canCreate: true } }, {
    createAuctionAction: async (input) => { saved = input; return { success: true, data: auction }; },
  });
  const shopping = find(h.render(), (node) => node.type === "button" && find(node.props.children, (child) => child.props?.children === "Shopping"));
  shopping.props.onClick();
  for (const [id, value] of [["auction-title", "Shopping"], ["auction-starts-shopping", "2099-01-01T09:00"], ["auction-ends-timed", "2099-01-01T15:00"]]) {
    byId(h.render(), id).props.onChange({ target: { value } });
  }
  submit(h.render());
  await h.settle();
  assert.equal(saved.mode, "TIMED");
  assert.equal(saved.endsAt, "2099-01-01T15:00:00-03:00");
});

test("Shopping rejects missing or non-increasing auction closing before saving", async () => {
  for (const value of ["", "2099-01-01T08:00", "2099-01-01T09:00"]) {
    let saves = 0;
    const h = harness("components/Management/AuctionForm.tsx", "AuctionForm", { initialData: auction, capabilities: { canEdit: true } }, {
      updateAuctionAction: async () => { saves++; },
    });
    byId(h.render(), "auction-ends-timed").props.onChange({ target: { value } });
    submit(h.render());
    await h.settle();
    assert.equal(saves, 0);
    assert.match(find(h.render(), (node) => node.props?.role === "status").props.children, /encerramento posterior ao início/);
  }
});

test("Shopping keeps legacy pre-bids when submitting the auction closing", async () => {
  let saved;
  const h = harness("components/Management/AuctionForm.tsx", "AuctionForm", {
    initialData: { ...auction, preBidStartsAt: "2099-01-01T06:00:00Z", preBidEndsAt: "2099-01-01T10:00:00Z", pauseHours: 2 },
    capabilities: { canEdit: true },
  }, { updateAuctionAction: async (id, input) => { saved = input; return { success: true, data: auction }; } });
  submit(h.render());
  await h.settle();
  assert.equal(saved.endsAt, "2099-01-01T15:00:00-03:00");
  assert.equal(saved.preBidStartsAt, "2099-01-01T03:00:00-03:00");
  assert.equal(saved.pauseHours, 2);
});

test("new Shopping lots inherit the auction end and allow editing it before saving", async () => {
  for (const override of [null, "2099-01-01T17:00"]) {
    let saved;
    const h = harness("components/Management/AuctionLotsPanel.tsx", "AuctionLotsPanel", {
      auctionId: auction.id, initialLots: [], mode: "TIMED", auctionEndsAt: auction.endsAt,
      capabilities: { canManageLots: true },
    }, { createAuctionLotAction: async (id, input) => { saved = input; return { success: true, data: { id: "lot-1", ...input } }; } });
    find(h.render(), (node) => node.type === "button" && React.Children.toArray(node.props.children).includes("Novo lote")).props.onClick();
    let form = find(h.render(), (node) => node.type?.name === "LotForm");
    assert.equal(form.props.draft.closesAt, "2099-01-01T15:00");
    const rendered = form.type(form.props);
    assert.equal(byId(rendered, "lot-closes").props["aria-describedby"], "lot-closes-help");
    if (override) byId(rendered, "lot-closes").props.onChange({ target: { value: override } });
    form = find(h.render(), (node) => node.type?.name === "LotForm");
    form.props.onSubmit({ preventDefault() {} });
    await h.settle();
    assert.equal(saved.closesAt, `${override ?? "2099-01-01T15:00"}:00-03:00`);
  }
});

test("editing a lot preserves its custom end or fills a missing end from the auction", () => {
  for (const closing of [null, "2099-01-01T20:00:00Z"]) {
    const lot = { id: "lot-1", number: 1, sortOrder: 1, title: "Lote 1", slug: "lote-1", closesAt: closing, images: [] };
    const h = harness("components/Management/AuctionLotsPanel.tsx", "AuctionLotsPanel", {
      auctionId: auction.id, initialLots: [lot], mode: "TIMED", auctionEndsAt: auction.endsAt,
      capabilities: { canManageLots: true },
    });
    find(h.render(), (node) => node.type?.name === "LotRow").props.onEdit();
    const form = find(h.render(), (node) => node.type?.name === "LotForm");
    assert.equal(form.props.draft.closesAt, closing ? "2099-01-01T17:00" : "2099-01-01T15:00");
  }
});
