import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(new URL("../lib/auctions/description.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
const { getAuctionIntroDescription } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("a regulation copied into the legacy description is shown only through the regulation section", () => {
  const regulation = "REGULAMENTO\nCondições completas de participação.";
  assert.equal(getAuctionIntroDescription(regulation, regulation), null);
  assert.equal(getAuctionIntroDescription("  REGULAMENTO\r\n\r\nCondições completas de participação. ", regulation), null);
});

test("an independent description remains visible without removing regulatory content", () => {
  assert.equal(getAuctionIntroDescription("  Leilão de animais selecionados.  ", "Condições completas."), "Leilão de animais selecionados.");
  assert.equal(getAuctionIntroDescription("Apresentação e condições completas.", "Condições completas."), "Apresentação e condições completas.");
});

test("a description is preserved when no regulation was registered", () => {
  assert.equal(getAuctionIntroDescription("REGULAMENTO: consulte a equipe.", null), "REGULAMENTO: consulte a equipe.");
  assert.equal(getAuctionIntroDescription("Texto de apresentação.", " "), "Texto de apresentação.");
  assert.equal(getAuctionIntroDescription(" ", "Regras"), null);
  assert.equal(getAuctionIntroDescription(null, null), null);
});
