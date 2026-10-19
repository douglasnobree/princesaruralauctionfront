import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(path, mocks = {}, extra = "") {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8") + extra;
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const loadedModule = { exports: {} };
  const localRequire = (id) => mocks[id] ?? (id === "next/dynamic" ? () => () => null : id === "next/navigation" ? { useRouter: () => ({ refresh() {} }) } : id.startsWith("@/") ? {} : require(id));
  new Function("require", "module", "exports", compiled)(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const { AuctionStatusControls } = load("components/Management/AuctionWorkspace.tsx", {}, "\nexport { AuctionStatusControls };\n");
const renderControls = (status, canPublish, reason, operationUnavailable = true, canManageStatus = true) => renderToStaticMarkup(React.createElement(AuctionStatusControls, {
  auction: { id: "auction-1", status, availableActions: { canPublish, reasons: reason ? { publish: { message: reason } } : {} } },
  capabilities: { canManageStatus }, operationUnavailable,
}));

test("drafts keep Publicar visible and explain blocked publication", () => {
  const blocked = renderControls("DRAFT", false, "Adicione um banner.");
  assert.match(blocked, /disabled=""[^>]*aria-describedby="publish-blocked-reason"/);
  assert.match(blocked, />Publicar<\/button>/);
  assert.match(blocked, /Publicação pendente: Adicione um banner\./);
  assert.doesNotMatch(renderControls("DRAFT", true), /disabled=""/);
});

test("published auctions can prepare missing executions regardless of catalog canPublish", () => {
  for (const status of ["PRE_LAUNCH", "COMING_SOON", "WAITING_OPENING", "OPEN"]) {
    assert.match(renderControls(status, false), />Preparar operação<\/button>/);
    assert.doesNotMatch(renderControls(status, false, undefined, false), />Publicar<\/button>|>Preparar operação<\/button>/);
  }
});

test("closed, cancelled, and unauthorized auctions have no publication control", () => {
  for (const status of ["CLOSED", "CANCELLED"]) assert.doesNotMatch(renderControls(status, false), />Publicar<\/button>|>Preparar operação<\/button>/);
  assert.doesNotMatch(renderControls("DRAFT", true, undefined, true, false), />Publicar<\/button>/);
});

test("draft detail loads the catalog without requesting a nonexistent engine snapshot", async () => {
  let snapshots = 0;
  const page = load("app/(management)/admin/leiloes/[id]/page.tsx", {
    "@/lib/permissions/server/auction-access": { getAuctionManagementAccess: async () => ({ session: { user: {} }, permissions: [] }) },
    "@/components/Management/capabilities": { permissionsToAuctionCapabilities: () => ({ canView: true }) },
    "@/hooks/actions/auctionActions": { getAdminAuctionAction: async () => ({ success: true, data: { status: "DRAFT" } }), getAuctionLotsAction: async () => ({ data: [] }) },
    "@/hooks/actions/auctionEngineActions": { getEngineSnapshotAction: async () => { snapshots++; return { data: {} }; } },
    "@/components/Management/AuctionWorkspace": { AuctionWorkspace: () => null },
  }).default;
  const result = await page({ params: Promise.resolve({ id: "auction-1" }) });
  assert.equal(snapshots, 0);
  assert.equal(result.props.engineSnapshot, null);
  assert.match(result.props.engineError, /Publique o leilão/);
});

test("snapshot reads explain AUCTION_NOT_FOUND instead of showing a generic error", async () => {
  const errors = load("lib/auctions/engine-errors.ts");
  const { managerRead } = load("lib/auctions/manager-read.ts", { "@/lib/auctions/engine-errors": errors });
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ code: "AUCTION_NOT_FOUND" }, { status: 404 });
  try { await assert.rejects(managerRead("auctions/auction-1/snapshot"), /Use Publicar ou Preparar operação/); }
  finally { globalThis.fetch = previousFetch; }
});

test("the seller CTA follows the auction listing", () => {
  const page = readFileSync(new URL("../app/leiloes/page.tsx", import.meta.url), "utf8");
  const listingStart = page.indexOf('id="agenda"');
  const listingEnd = page.indexOf("</section>", listingStart);
  const sellerCta = page.indexOf("<AuctionSellerCta />");
  assert.ok(listingStart >= 0 && listingEnd > listingStart && sellerCta > listingEnd);
});

test("seller enquiries use the PR Leilões contact number", () => {
  const { AUCTION_TEAM_WHATSAPP, getAuctionEnquiryUrl } = load("lib/auction-enquiries.ts");
  const lotInformation = readFileSync(new URL("../components/Auction/AuctionLotInformationSections.tsx", import.meta.url), "utf8");
  assert.equal(AUCTION_TEAM_WHATSAPP, "559188794342");
  assert.match(getAuctionEnquiryUrl(), /wa\.me\/559188794342\?/);
  assert.match(lotInformation, /PRINCESA_RURAL_WHATSAPP = "559188794342"/);
});

test("new auction registrations start with WhatsApp updates enabled and can be turned off", () => {
  const dialog = readFileSync(new URL("../components/Auction/AuctionRegistrationDialog.tsx", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../hooks/actions/auctionEngineActions.ts", import.meta.url), "utf8");
  assert.match(dialog, /whatsappChoice\?\.auctionId === auctionId \? whatsappChoice\.value : true/);
  assert.match(dialog, /setWhatsappChoice\(\{ auctionId, value: event\.target\.checked \}\)/);
  assert.match(actions, /acquisitionSource: AcquisitionSource = "UNKNOWN", whatsappOptIn = true/);
});
