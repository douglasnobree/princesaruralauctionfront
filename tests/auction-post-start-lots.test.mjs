import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);

function setup(overrides = {}) {
  const state = [];
  let cursor = 0;
  let transition;
  let refreshes = 0;
  const calls = [];
  const react = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (next) => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
    },
    useMemo: (callback) => callback(),
    useEffect() {},
    useTransition: () => [false, (callback) => { transition = callback(); }],
  };
  const action = async (auctionId, input) => {
    calls.push({ auctionId, input });
    return { success: true, data: { ...input, id: "lot-2", images: [], sortOrder: 2 } };
  };
  const mocks = {
    react,
    "next/navigation": { useRouter: () => ({ refresh: () => { refreshes++; } }) },
    "@/hooks/actions/auctionActions": { createAuctionLotAction: action },
    "@/lib/auctions/admin-utils": { toDateTimeLocalBrt: () => "", fromDateTimeLocalBrt: () => undefined },
    "@/lib/auctions/form-mappers": { slugifyAuction: () => "lote-2" },
  };
  const source = readFileSync(new URL("../components/Management/AuctionLotsPanel.tsx", import.meta.url), "utf8") + "\nexport { LotForm };\n";
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  const localRequire = (id) => mocks[id] ?? (id.startsWith("@/") ? {} : require(id));
  new Function("require", "module", "exports", compiled)(localRequire, loaded, loaded.exports);
  const props = {
    auctionId: "auction-1", initialLots: [], mode: "LIVE",
    capabilities: { canManageLots: false, canViewBids: false },
    canEditLots: true, canCreateLots: true, ...overrides,
  };
  const render = () => { cursor = 0; return loaded.exports.AuctionLotsPanel(props); };
  return { render, LotForm: loaded.exports.LotForm, calls, state, wait: () => transition, refreshes: () => refreshes };
}

function find(node, predicate) {
  if (!React.isValidElement(node)) return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props.children)) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}

function newLotButton(tree) {
  return find(tree, (node) => node.type === "button" && React.Children.toArray(node.props.children).includes("Novo lote"));
}

function openForm(harness) {
  const button = newLotButton(harness.render());
  assert.ok(button, "Novo lote is available after the start");
  button.props.onClick();
  return find(harness.render(), (node) => node.type === harness.LotForm);
}

test("the post-start create form requires justification and keeps its controls enabled", () => {
  const harness = setup();
  const form = openForm(harness);
  assert.equal(form.props.disabled, false);
  const markup = renderToStaticMarkup(React.createElement(harness.LotForm, form.props));
  assert.match(markup, /Justificativa da inclusão/);
  assert.match(markup, /id="lot-change-reason" required="" maxLength="1000" aria-describedby="lot-change-reason-help"/);
  assert.match(markup, /Explique por que este lote está sendo adicionado após o início/);
  assert.doesNotMatch(markup, /disabled=""/);
});

test("blank justification blocks the create request and explains how to proceed", () => {
  const harness = setup();
  const form = openForm(harness);
  form.props.onChange("changeReason", "   ");
  find(harness.render(), (node) => node.type === harness.LotForm).props.onSubmit({ preventDefault() {} });
  assert.equal(harness.calls.length, 0);
  assert.match(harness.state[3], /justificativa para adicionar o lote após o início/);
});

test("saving a post-start lot sends the trimmed justification and refreshes the workspace", async () => {
  const harness = setup();
  const form = openForm(harness);
  form.props.onChange("title", " Lote 2 ");
  form.props.onChange("startingBid", "100,00");
  form.props.onChange("changeReason", "  Recebido após a abertura.  ");
  find(harness.render(), (node) => node.type === harness.LotForm).props.onSubmit({ preventDefault() {} });
  await harness.wait();
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0].auctionId, "auction-1");
  assert.equal(harness.calls[0].input.changeReason, "Recebido após a abertura.");
  assert.equal(harness.calls[0].input.startingBidCents, 10000);
  assert.equal(harness.calls[0].input.title, "Lote 2");
  assert.equal(harness.state[0].length, 1);
  assert.equal(harness.state[1], null);
  assert.equal(harness.refreshes(), 1);
});

test("creation stays hidden when blocked by lifecycle or the user's permission", () => {
  for (const overrides of [
    { canCreateLots: false },
    { canCreateLots: false, canEditLots: false },
    { canCreateLots: undefined, canEditLots: true },
  ]) {
    assert.equal(newLotButton(setup(overrides).render()), null);
  }
});

test("creation before the start does not request justification", async () => {
  const harness = setup({ capabilities: { canManageLots: true } });
  const form = openForm(harness);
  assert.equal(form.props.requiresChangeReason, false);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(harness.LotForm, form.props)), /lot-change-reason/);
  form.props.onChange("title", "Lote 2");
  form.props.onChange("startingBid", "100,00");
  find(harness.render(), (node) => node.type === harness.LotForm).props.onSubmit({ preventDefault() {} });
  await harness.wait();
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0].input.changeReason, undefined);
});

test("editing keeps its existing justification label", () => {
  const harness = setup();
  const form = openForm(harness);
  const markup = renderToStaticMarkup(React.createElement(harness.LotForm, { ...form.props, editing: true }));
  assert.match(markup, /Justificativa da alteração/);
  assert.match(markup, /este lote precisa ser alterado após o início/);
});
