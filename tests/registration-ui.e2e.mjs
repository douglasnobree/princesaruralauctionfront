import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const backend = createServer(async (request, response) => {
  if (request.url !== "/api/auth/register") {
    response.writeHead(404).end();
    return;
  }
  if (slowResponse) return;
  let body = "";
  for await (const chunk of request) body += chunk;
  submittedPayload = JSON.parse(body);
  response.writeHead(201, { "Content-Type": "application/json" }).end("{}");
});
let slowResponse = true;
let submittedPayload;
await new Promise((resolve) => backend.listen(0, "127.0.0.1", resolve));

const port = 3347;
const origin = `http://127.0.0.1:${port}`;
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(),
  windowsHide: true,
  env: { ...process.env, API_BASE_URL: `http://127.0.0.1:${backend.address().port}/api` },
  stdio: ["ignore", "pipe", "pipe"],
});
let appOutput = "";
app.stdout.on("data", (chunk) => { appOutput += chunk; });
app.stderr.on("data", (chunk) => { appOutput += chunk; });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(`${origin}/cadastro`);
      if (response.ok) { ready = true; break; }
    } catch {}
    if (app.exitCode !== null) throw new Error(appOutput);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  assert.ok(ready, appOutput);

  browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  const page = await browser.newPage();
  await page.goto(`${origin}/cadastro`);
  const nameInput = page.getByLabel("Nome completo");
  await nameInput.click();
  await page.keyboard.type("P");
  assert.equal(await nameInput.evaluate((input) => input === document.activeElement), true, "O nome deve continuar focado após o primeiro caractere.");
  await page.keyboard.type("e");
  assert.equal(await nameInput.inputValue(), "Pe", "A digitação deve continuar no mesmo campo.");
  await page.getByRole("button", { name: "Concluir cadastro" }).click();
  await nameInput.click();
  await page.keyboard.type("s");
  assert.equal(await nameInput.evaluate((input) => input === document.activeElement), true, "O campo deve manter o foco também após um envio inválido.");
  await page.getByLabel("Nome completo").fill("Pessoa de Teste");
  await page.getByLabel("CPF", { exact: true }).fill("12345678901");
  await page.getByLabel("Telefone/WhatsApp").fill("85999991234");
  await page.getByLabel("E-mail", { exact: true }).fill("teste@example.invalid");
  await page.getByLabel("Senha", { exact: true }).fill("senha123");
  await page.getByLabel("Confirmar senha", { exact: true }).fill("senha123");
  await page.locator('input[type="checkbox"]').check();

  await page.getByRole("button", { name: "Concluir cadastro" }).click();
  await page.getByText("Não foi possível confirmar o cadastro.", { exact: false }).waitFor({ timeout: 25000 });
  assert.equal(await page.getByRole("button", { name: "Concluir cadastro" }).isEnabled(), true);

  slowResponse = false;
  await page.getByRole("button", { name: "Concluir cadastro" }).click();
  await page.getByRole("heading", { name: "Conta criada com sucesso" }).waitFor();
  assert.equal(submittedPayload.phone, "85999991234");
  assert.equal(submittedPayload.cpf, "12345678901");
  console.log("Cadastro: espera limitada, erro recuperável e envio bem-sucedido.");
} catch (error) {
  console.error(appOutput.slice(-2000));
  throw error;
} finally {
  await browser?.close();
  app.kill();
  backend.closeAllConnections();
  await new Promise((resolve) => backend.close(resolve));
}
