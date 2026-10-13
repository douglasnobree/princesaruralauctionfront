import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  const localRequire = (id) => mocks[id] ?? (id.startsWith("@/") ? {} : require(id));
  new Function("require", "module", "exports", compiled)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}

const urls = load("lib/config/urls.ts");
const seo = load("lib/seo.ts", { "@/lib/config/urls": { getAuctionAppUrl: () => "https://prleiloes.com" } });
const schemas = load("lib/seo/structured-data.ts", { "@/lib/seo": seo });
const { JsonLd } = load("components/Seo/JsonLd.tsx");
const lot = {
  id: "lot-1", slug: "touro-premiado", number: 7, title: "Touro premiado",
  status: "OPEN", category: "ANIMAL", image: "https://back.princesarural.com.br/uploads/touro.jpg",
  images: [], details: [{ label: "Raça", value: "Nelore" }], startingBidCents: 500000,
};
const auction = {
  id: "auction-1", slug: "leilao-nelore", title: "Leilão Nelore",
  description: "Seleção de animais Nelore.", status: "COMING_SOON", lotCount: 1,
  image: "https://back.princesarural.com.br/uploads/nelore.jpg", lots: [lot],
};
const notFound = () => { throw new Error("NEXT_NOT_FOUND"); };

test("canonical origin honors the server configuration and normalizes paths", () => {
  const previous = process.env.AUCTION_APP_URL;
  try {
    process.env.AUCTION_APP_URL = "https://leiloes.example.com/base?utm_source=test";
    assert.equal(urls.getAuctionAppUrl(), "https://leiloes.example.com");
    process.env.AUCTION_APP_URL = "javascript:alert(1)";
    assert.equal(urls.getAuctionAppUrl(), "https://prleiloes.com");
  } finally {
    if (previous === undefined) delete process.env.AUCTION_APP_URL;
    else process.env.AUCTION_APP_URL = previous;
  }
  assert.equal(seo.lotPath("leilão/teste", "lote #1"), "/leiloes/leil%C3%A3o%2Fteste/lotes/lote%20%231");
});

test("auction and lot metadata identify their own page and photo", async () => {
  const pageData = {
    getPublicAuctionPage: async () => ({ auction }),
    getPublicLotPage: async () => ({ auction, lot }),
  };
  const mocks = { "@/lib/auctions/public-page": pageData, "@/lib/seo": seo };
  const auctionPage = load("app/leiloes/[auctionSlug]/page.tsx", mocks);
  const lotPage = load("app/leiloes/[auctionSlug]/lotes/[lotSlug]/page.tsx", mocks);
  const params = Promise.resolve({ auctionSlug: auction.slug, lotSlug: lot.slug });
  const auctionMetadata = await auctionPage.generateMetadata({ params });
  const lotMetadata = await lotPage.generateMetadata({ params });
  assert.equal(auctionMetadata.title, auction.title);
  assert.equal(auctionMetadata.description, auction.description);
  assert.equal(auctionMetadata.alternates.canonical, "https://prleiloes.com/leiloes/leilao-nelore");
  assert.equal(auctionMetadata.openGraph.images[0].url, auction.image);
  assert.equal(lotMetadata.title, "Lote 7: Touro premiado | Leilão Nelore");
  assert.equal(lotMetadata.openGraph.url, lotMetadata.alternates.canonical);
  assert.equal(lotMetadata.twitter.images[0], lot.image);
  assert.match(lotMetadata.description, /Raça: Nelore/);
  assert.equal(lotMetadata.robots.index, true);
  assert.equal(lotMetadata.robots.googleBot["max-image-preview"], "large");
});

test("listing filters and internal searches are noindex with a clean canonical", async () => {
  const { generateMetadata } = load("app/leiloes/page.tsx", { "@/lib/seo": seo });
  for (const search of [{}, { q: " " }, { tipo: "all" }]) {
    const metadata = await generateMetadata({ searchParams: Promise.resolve(search) });
    assert.equal(metadata.robots.index, true);
  }
  for (const search of [{ q: "Nelore" }, { tipo: "live" }, { tipo: "mercado", q: "Touro" }]) {
    const metadata = await generateMetadata({ searchParams: Promise.resolve(search) });
    assert.equal(metadata.robots.index, false);
    assert.equal(metadata.robots.googleBot.index, false);
    assert.equal(metadata.robots.follow, true);
    assert.equal(metadata.alternates.canonical, "https://prleiloes.com/leiloes");
  }
});

test("public metadata keeps 404s for missing or engine-closed auctions and lots", async () => {
  for (const status of ["FINISHED", "CLOSED", "CANCELLED", "ABORTED"]) {
    const data = load("lib/auctions/public-page.ts", {
      react: { cache: (fn) => fn }, "next/navigation": { notFound },
      "@/lib/auctions/catalog": { getAuctionBySlug: async () => auction },
      "@/hooks/actions/auctionEngineActions": { getEngineSnapshotAction: async () => ({ success: true, data: { auction: { status } } }) },
    });
    const page = load("app/leiloes/[auctionSlug]/page.tsx", {
      "@/lib/auctions/public-page": data, "@/lib/seo": seo,
    });
    await assert.rejects(page.generateMetadata({ params: Promise.resolve({ auctionSlug: auction.slug }) }), /NEXT_NOT_FOUND/);
  }
  let engineReads = 0;
  const missing = load("lib/auctions/public-page.ts", {
    react: { cache: (fn) => fn }, "next/navigation": { notFound },
    "@/lib/auctions/catalog": { getAuctionBySlug: async () => undefined },
    "@/hooks/actions/auctionEngineActions": { getEngineSnapshotAction: async () => { engineReads++; } },
  });
  await assert.rejects(missing.getPublicAuctionPage("missing"), /NEXT_NOT_FOUND/);
  assert.equal(engineReads, 0);
  const missingLot = load("lib/auctions/public-page.ts", {
    react: { cache: (fn) => fn }, "next/navigation": { notFound },
    "@/lib/auctions/catalog": { getAuctionBySlug: async () => auction, getAuctionLotBySlug: async () => undefined },
    "@/hooks/actions/auctionEngineActions": { getEngineSnapshotAction: async () => ({ success: false }) },
  });
  await assert.rejects(missingLot.getPublicLotPage(auction.slug, "missing"), /NEXT_NOT_FOUND/);
});

test("sitemap includes public lots only and does not invent last-modified dates", async () => {
  const { isPublicAuction } = load("lib/auctions/catalog.ts", {
    "@/lib/api/base-url": load("lib/api/base-url.ts"),
  });
  const catalog = [
    { ...auction, lots: [lot, { ...lot, slug: "vendido", status: "SOLD" }, { ...lot, slug: "encerrado", status: "CLOSED" }, { ...lot, slug: "pausado", status: "PAUSED" }, { ...lot, slug: "cancelado", status: "CANCELLED" }] },
    { ...auction, slug: "draft", status: "DRAFT" },
    { ...auction, slug: "closed", status: "CLOSED" },
    { ...auction, slug: "cancelled", status: "CANCELLED" },
    auction,
  ];
  const sitemap = load("app/sitemap.ts", {
    "@/lib/seo": seo, "@/lib/auctions/catalog": { getAuctions: async () => catalog, isPublicAuction },
  }).default;
  const entries = await sitemap();
  assert.deepEqual(entries.map(({ url }) => url), [
    "https://prleiloes.com/leiloes", "https://prleiloes.com/faca-seu-leilao",
    "https://prleiloes.com/leiloes/leilao-nelore",
    "https://prleiloes.com/leiloes/leilao-nelore/lotes/touro-premiado",
    "https://prleiloes.com/leiloes/leilao-nelore/lotes/vendido",
    "https://prleiloes.com/leiloes/leilao-nelore/lotes/encerrado",
  ]);
  assert.ok(entries.every((entry) => !("lastModified" in entry)));
  const unavailable = load("app/sitemap.ts", {
    "@/lib/seo": seo, "@/lib/auctions/catalog": { getAuctions: async () => { throw new Error("API unavailable"); } },
  }).default;
  await assert.rejects(unavailable(), /API unavailable/);
});

test("structured data matches public content without using the starting bid as a sale price", () => {
  const product = schemas.lotStructuredData(auction, lot).mainEntity;
  assert.equal(product.name, lot.title);
  assert.deepEqual(product.image, [lot.image]);
  assert.equal(product.additionalProperty[0].value, "Nelore");
  assert.equal("offers" in product, false);
  assert.equal("aggregateRating" in product, false);
  const placeholderProduct = schemas.lotStructuredData(auction, { ...lot, image: "/placeholder-image.svg" }).mainEntity;
  assert.equal("image" in placeholderProduct, false);
  const breadcrumb = schemas.breadcrumbStructuredData([
    { name: "Leilões", path: "/leiloes" }, { name: auction.title, path: seo.auctionPath(auction.slug) },
  ]);
  assert.equal(breadcrumb.itemListElement[1].position, 2);
  assert.equal(breadcrumb.itemListElement[1].item, "https://prleiloes.com/leiloes/leilao-nelore");
});

test("a missing catalog endpoint fails instead of masquerading as an empty catalog", async () => {
  const catalog = load("lib/auctions/catalog.ts", {
    "@/lib/api/base-url": load("lib/api/base-url.ts"),
  });
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({}, { status: 404 });
    await assert.rejects(catalog.getAuctions(), /catálogo público de leilões não foi encontrado/);
    assert.equal(await catalog.getAuctionBySlug("missing"), undefined);
    globalThis.fetch = async () => Response.json([]);
    assert.deepEqual(await catalog.getAuctions(), []);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("untrusted catalog text cannot close the JSON-LD script", () => {
  const maliciousTitle = '</script><script>alert("xss")</script>';
  const html = renderToStaticMarkup(React.createElement(JsonLd, { data: { name: maliciousTitle } }));
  assert.equal((html.match(/<script/g) || []).length, 1);
  assert.ok(html.includes("\\u003c/script>"));
  const json = html.match(/<script[^>]*>([\s\S]*)<\/script>/)[1];
  assert.equal(JSON.parse(json).name, maliciousTitle);
});

test("robots leaves noindex HTML crawlable and operational pages keep noindex", () => {
  const robots = load("app/robots.ts", { "@/lib/seo": seo }).default();
  assert.equal(robots.sitemap, "https://prleiloes.com/sitemap.xml");
  assert.equal(robots.rules.disallow, "/api/");
  for (const path of ["login/page.tsx", "login/google/page.tsx", "cadastro/page.tsx", "perfil/page.tsx", "sso/page.tsx", "acesso-negado/page.tsx", "broadcast/layout.tsx", "(management)/admin/layout.tsx"]) {
    assert.equal(load(`app/${path}`).metadata.robots.index, false, path);
  }
});
