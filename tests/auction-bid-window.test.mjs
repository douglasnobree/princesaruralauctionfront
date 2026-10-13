import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../lib/auctions/bid-window.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
new Function("module", "exports", compiled)(loaded, loaded.exports);
const { auctionAcceptsBids, isPreBidOpen, isPreBidClosed, isShoppingPurchaseOpen } = loaded.exports;

const auction = {
  mode: "LIVE",
  status: "RUNNING",
  preBidEnabled: true,
  preBidStartsAt: "2026-10-13T10:00:00Z",
  preBidEndsAt: "2026-10-13T12:00:00Z",
  startsAt: "2026-10-13T14:00:00Z",
};
const instant = (value) => new Date(value).getTime();

test("manual live opening accepts bids before, at and after the pre-bid cutoff", () => {
  for (const now of ["2026-10-13T09:00:00Z", "2026-10-13T11:59:59Z", "2026-10-13T12:00:00Z", "2026-10-13T13:00:00Z"]) {
    assert.equal(auctionAcceptsBids(auction, instant(now)), true);
    assert.equal(isPreBidOpen(auction, instant(now)), false);
    assert.equal(isPreBidClosed(auction, instant(now)), false);
  }
});

test("scheduled live auctions still close pre-bids at the exact cutoff", () => {
  const scheduled = { ...auction, status: "SCHEDULED" };
  assert.equal(auctionAcceptsBids(scheduled, instant("2026-10-13T11:59:59Z")), true);
  assert.equal(auctionAcceptsBids(scheduled, instant(auction.preBidEndsAt)), false);
  assert.equal(isPreBidClosed(scheduled, instant(auction.preBidEndsAt)), true);
});

test("paused and finished live auctions reject bids", () => {
  for (const status of ["PAUSED", "FINISHED", "CANCELLED"]) {
    assert.equal(auctionAcceptsBids({ ...auction, status }, instant("2026-10-13T15:00:00Z")), false);
  }
});

test("timed and shopping auctions retain their scheduled start boundaries", () => {
  const now = instant("2026-10-13T13:00:00Z");
  assert.equal(auctionAcceptsBids({ ...auction, mode: "TIMED" }, now), false);
  assert.equal(auctionAcceptsBids({ ...auction, mode: "TIMED" }, instant(auction.startsAt)), true);
  assert.equal(isShoppingPurchaseOpen({ ...auction, mode: "SHOPPING", endsAt: "2026-10-13T16:00:00Z" }, now), false);
});
