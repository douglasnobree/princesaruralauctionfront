import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { test } from 'node:test';

const source = ts.transpileModule(readFileSync(new URL('../lib/auctions/acquisition-sources.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { detectAcquisitionSource } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('retains campaign attribution across internal navigation and login', () => {
  const saved = new Map();
  globalThis.window = { location: { search: '?utm_source=whatsapp', hostname: 'prleiloes.com' }, sessionStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) } };
  globalThis.document = { referrer: '' };
  assert.equal(detectAcquisitionSource(), 'WHATSAPP');
  window.location.search = '';
  document.referrer = 'https://prleiloes.com/login';
  assert.equal(detectAcquisitionSource(), 'WHATSAPP');
  saved.clear();
  assert.equal(detectAcquisitionSource(), 'DIRECT');
  delete globalThis.window;
  delete globalThis.document;
});
