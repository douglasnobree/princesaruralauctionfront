import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/api/base-url") {
      return nextResolve(new URL("../lib/api/base-url.ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { registerAuctionAccountAction } = await import("../hooks/actions/auctionRegistrationActions.ts");

const validInput = {
  accountType: "PERSON",
  name: "Pessoa de Teste",
  document: "123.456.789-01",
  phone: "(85) 99999-1234",
  email: "teste@example.invalid",
  password: "senha123",
};

test("rejects missing phone before calling the API", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("API should not be called"); };
  try {
    const result = await registerAuctionAccountAction({ ...validInput, phone: "" });
    assert.equal(result.success, false);
    assert.deepEqual(result.errors.phone, ["Informe um telefone com DDD válido."]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sends required phone and document to the registration API", async () => {
  const originalFetch = globalThis.fetch;
  const payloads = [];
  globalThis.fetch = async (_url, options) => {
    payloads.push(JSON.parse(options.body));
    return Response.json({}, { status: 201 });
  };
  try {
    assert.deepEqual(await registerAuctionAccountAction(validInput), { success: true });
    assert.deepEqual(await registerAuctionAccountAction({
      ...validInput,
      accountType: "COMPANY",
      document: "12.345.678/0001-90",
    }), { success: true });
    assert.equal(payloads[0].phone, "85999991234");
    assert.equal(payloads[0].cpf, "12345678901");
    assert.equal(payloads[1].phone, "85999991234");
    assert.equal(payloads[1].cnpj, "12345678000190");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
