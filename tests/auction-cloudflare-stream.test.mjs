import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, mocks = {}, browser = {}) {
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", "RTCPeerConnection", "MediaStream", "fetch", "console", source)(
    (id) => mocks[id] ?? require(id), module, module.exports, browser.Peer, browser.Media, browser.fetch, browser.console ?? console,
  );
  return module.exports;
}
const cloudflare = load("lib/auctions/cloudflare-stream.ts");
const url = "https://customer-test.cloudflarestream.com/11111111111111111111111111111111/webRTC/play";

function diagnostics(response, error, apiBase = 'https://api.example.test/api') {
  const events = [];
  const calls = [];
  const reference = '85c1bf42-d02d-4c28-8533-a7d604d54748';
  const mocks = {
    'node:crypto': { randomUUID: () => reference },
    'next/cache': { revalidatePath: () => undefined },
    '@/lib/auth/server/authenticated-fetch': { authenticatedFetch: async (target, options) => {
      calls.push({ target, options });
      if (error) throw error;
      return response;
    } },
    '@/lib/auctions/engine-errors': load('lib/auctions/engine-errors.ts'),
    '@/lib/api/base-url': load('lib/api/base-url.ts'),
    '@/lib/auctions/cloudflare-stream': cloudflare,
  };
  const browser = { console: { info: (_tag, details) => events.push(details), error: (_tag, details) => events.push(details) } };
  const originalApi = process.env.API_BASE_URL;
  process.env.API_BASE_URL = apiBase;
  try {
    return { actions: load('hooks/actions/auctionEngineActions.ts', mocks, browser), proxy: load('app/api/auction-engine/[...path]/route.ts', mocks, browser), calls, events, reference };
  } finally {
    if (originalApi === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = originalApi;
  }
}

test('diagnoses the missing backend route from the screenshot with a traceable reference', async () => {
  const s = diagnostics(Response.json({ message: 'Cannot POST /api/auction-engine/manager/auctions/auction-1/stream/cloudflare', error: 'Not Found', statusCode: 404 }, { status: 404 }));
  const result = await s.actions.prepareCloudflareStreamAction('auction-1');
  assert.equal(result.errorCode, 'CLOUDFLARE_STREAM_ROUTE_NOT_FOUND');
  assert.equal(result.correlationId, s.reference);
  assert.match(result.error, /backend foi atualizado/);
  assert.equal(s.calls[0].options.headers['X-Correlation-Id'], s.reference);
  assert.equal(s.events.at(-1).httpStatus, 404);
  assert.equal(s.events.at(-1).missingRoute, true);
  assert.equal(s.events.at(-1).target, 'https://api.example.test/api/auction-engine/manager/auctions/auction-1/stream/cloudflare');
});

test('distinguishes an auction missing in the engine from a missing HTTP route', async () => {
  const s = diagnostics(Response.json({ code: 'AUCTION_NOT_FOUND' }, { status: 404 }));
  const result = await s.actions.prepareCloudflareStreamAction('auction-1');
  assert.equal(result.errorCode, 'AUCTION_NOT_FOUND');
  assert.equal(s.events.at(-1).missingRoute, false);
});

test('keeps API credentials and OBS publishing data out of success diagnostics', async () => {
  const input = { id: 'input-1', playbackUrl: url, publishUrl: 'https://customer-test.cloudflarestream.com/private-obs-secret/webRTC/publish' };
  const s = diagnostics(Response.json({ available: true, input }, { status: 201 }), undefined, 'https://private-user:private-api-secret@api.example.test/api');
  const result = await s.actions.prepareCloudflareStreamAction('auction-1');
  assert.equal(result.data.input.publishUrl, input.publishUrl);
  assert.doesNotMatch(JSON.stringify(s.events), /private-user|private-api-secret|private-obs-secret/);
  assert.equal(cloudflare.getCloudflareDiagnosticTarget('https://user:password@api.example.test/api?token=secret#private'), 'https://api.example.test/api');
});

test('reports a connection error without leaking exception details', async () => {
  const s = diagnostics(undefined, new TypeError('private-api-secret'));
  const result = await s.actions.prepareCloudflareStreamAction('auction-1');
  assert.equal(result.errorCode, 'CLOUDFLARE_STREAM_CONNECTION_FAILED');
  assert.equal(s.events.at(-1).errorType, 'TypeError');
  assert.equal(result.correlationId, s.reference);
  assert.doesNotMatch(JSON.stringify(s.events), /private-api-secret/);
});

test('traces the setup GET through the frontend proxy without logging its private response or query', async () => {
  const s = diagnostics(Response.json({ available: true, input: { publishUrl: 'private-obs-secret' } }));
  const { NextRequest } = require('next/server');
  const response = await s.proxy.GET(new NextRequest('https://frontend.example.test/api/auction-engine/manager/auctions/auction-1/stream/cloudflare?private-query-secret'), { params: Promise.resolve({ path: ['manager', 'auctions', 'auction-1', 'stream', 'cloudflare'] }) });
  assert.equal(response.headers.get('x-correlation-id'), s.reference);
  assert.equal(s.calls[0].options.headers.get('x-correlation-id'), s.reference);
  assert.equal(s.events.at(-1).event, 'proxy.response');
  assert.equal(s.events.at(-1).httpStatus, 200);
  assert.doesNotMatch(JSON.stringify(s.events), /private-obs-secret|private-query-secret/);
});

test('limits proxy diagnostics to Cloudflare setup requests', async () => {
  const s = diagnostics(Response.json({ auction: {} }));
  const { NextRequest } = require('next/server');
  const response = await s.proxy.GET(new NextRequest('https://frontend.example.test/api/auction-engine/auctions/auction-1/snapshot'), { params: Promise.resolve({ path: ['auctions', 'auction-1', 'snapshot'] }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.has('x-correlation-id'), false);
  assert.equal(s.events.length, 0);
});

function setup({ failPost, location = "/session/1", invalidAnswer = false, gathering = false, pendingPost = false, discoverIceServers = false } = {}) {
  const calls = [];
  const tracks = [];
  let finishPost;
  class Peer extends EventTarget {
    static instances = [];
    iceGatheringState = gathering ? "gathering" : "complete";
    connectionState = "new";
    transceivers = [];
    closed = false;
    constructor(configuration) { super(); this.configuration = configuration; Peer.instances.push(this); }
    addTransceiver(kind, options) { this.transceivers.push({ kind, ...options }); }
    async createOffer() { return { type: "offer", sdp: "v=0\r\noffer" }; }
    async setLocalDescription(description) { this.localDescription = { ...description, sdp: gathering ? description.sdp : `${description.sdp}\r\na=candidate:complete` }; }
    async setRemoteDescription(description) { this.remoteDescription = description; }
    close() { this.closed = true; }
  }
  class Media {
    getTracks() { return tracks; }
    addTrack(track) { tracks.push(track); }
  }
  const postResponse = () => new Response(invalidAnswer ? "<html>Error</html>" : "v=0\r\nanswer", {
    status: failPost ?? 201, headers: { Location: location, "Content-Type": "application/sdp" },
  });
  const fetch = async (endpoint, init) => {
    calls.push({ endpoint, ...init });
    if (init.method === "OPTIONS") return new Response(null, { status: 204, headers: {
      Link: '<stun:stun.example.test:3478>; rel="ice-server", <turn:turn.example.test:3478>; rel="ice-server"; username="viewer"; credential="ephemeral"',
    } });
    if (init.method === "POST") return pendingPost ? new Promise((resolve) => { finishPost = () => resolve(postResponse()); }) : postResponse();
    return new Response(null, { status: 204 });
  };
  const client = load("lib/auctions/whep-client.ts", { "./cloudflare-stream": cloudflare }, { Peer, Media, fetch });
  const controller = new AbortController();
  const states = [];
  const streams = [];
  const start = () => client.startWhepPlayback(url, { signal: controller.signal, discoverIceServers, onStream: (s) => streams.push(s), onConnectionState: (s) => states.push(s) });
  return { start, client, Peer, tracks, calls, controller, states, streams, finishPost: () => finishPost() };
}

test("accepts only Cloudflare HTTPS playback endpoints, including opaque playback identifiers", () => {
  assert.equal(cloudflare.isCloudflareWebRtcPlaybackUrl(url), true);
  assert.equal(cloudflare.isCloudflareWebRtcPlaybackUrl(url.replace("11111111111111111111111111111111", "opaque-playback-identifier")), true);
  for (const invalid of [url.replace("https:", "http:"), url.replace("/play", "/publish"), url.replace("customer-test.cloudflarestream.com", "cloudflarestream.com.evil.test"), url.replace("https://", "https://secret@"), `${url}#secret`, "https://example.test/live.m3u8"]) {
    assert.equal(cloudflare.isCloudflareWebRtcPlaybackUrl(invalid), false, invalid);
  }
});

test("starts playback while ICE is still gathering without a discovery round trip", async () => {
  const s = setup({ gathering: true });
  const session = await s.start();
  assert.equal(s.Peer.instances[0].iceGatheringState, "gathering");
  assert.equal(s.calls[0].method, "POST");
  assert.equal(s.calls.some((call) => call.method === "OPTIONS"), false);
  assert.equal(s.calls[0].body, "v=0\r\noffer");
  assert.equal(s.Peer.instances[0].remoteDescription.type, "answer");
  await session.close();
});

test("can fall back to advertised TURN/STUN and gathered ICE and releases the session exactly once", async () => {
  const s = setup({ discoverIceServers: true });
  const session = await s.start();
  const peer = s.Peer.instances[0];
  assert.deepEqual(peer.transceivers, [{ kind: "video", direction: "recvonly" }, { kind: "audio", direction: "recvonly" }]);
  assert.equal(peer.configuration.iceServers[1].credential, "ephemeral");
  const post = s.calls.find((call) => call.method === "POST");
  assert.match(post.body, /candidate:complete/);
  assert.equal(post.credentials, "omit");
  assert.equal(post.headers["Content-Type"], "application/sdp");
  assert.equal(peer.remoteDescription.type, "answer");
  let stopped = 0;
  const track = { id: "video-1", stop: () => stopped++ };
  peer.ontrack({ track });
  peer.ontrack({ track });
  assert.equal(s.tracks.length, 1);
  peer.connectionState = "connected";
  peer.onconnectionstatechange();
  assert.deepEqual(s.states, ["connected"]);
  await session.close();
  await session.close();
  assert.equal(peer.closed, true);
  assert.equal(stopped, 1);
  assert.equal(s.calls.filter((call) => call.method === "DELETE").length, 1);
  assert.equal(s.calls.at(-1).endpoint, "https://customer-test.cloudflarestream.com/session/1");
});

test("a missing publisher is recoverable and closes the peer without leaving a session", async () => {
  const s = setup({ failPost: 404 });
  await assert.rejects(s.start(), (cause) => cause instanceof s.client.WhepPlaybackError && cause.status === 404);
  assert.equal(s.Peer.instances[0].closed, true);
  assert.equal(s.calls.some((call) => call.method === "DELETE"), false);
});

test("rejects an invalid SDP response and deletes its allocated session", async () => {
  const s = setup({ invalidAnswer: true });
  await assert.rejects(s.start(), /Resposta de reprodução inválida/);
  assert.equal(s.Peer.instances[0].closed, true);
  assert.equal(s.calls.at(-1).method, "DELETE");
});

test("cancels ICE gathering on unmount without starting playback", async () => {
  const s = setup({ gathering: true, discoverIceServers: true });
  const result = s.start();
  await new Promise(setImmediate);
  s.controller.abort();
  await assert.rejects(result);
  assert.equal(s.Peer.instances[0].closed, true);
  assert.equal(s.calls.some((call) => call.method === "POST"), false);
});

test("cleans up a successful response that arrives after the viewer has left", async () => {
  const s = setup({ pendingPost: true });
  const result = s.start();
  await new Promise(setImmediate);
  s.controller.abort();
  s.finishPost();
  await assert.rejects(result);
  assert.equal(s.calls.filter((call) => call.method === "DELETE").length, 1);
});

test("never follows an untrusted session Location for cleanup", async () => {
  const s = setup({ location: "https://untrusted.example/session/1" });
  const session = await s.start();
  await session.close();
  assert.equal(s.calls.some((call) => call.method === "DELETE"), false);
});

test("routes WebRTC to its player and stops it when the operator ends the signal", () => {
  const { CloudflareWebRtcPlayer } = load("components/Auction/CloudflareWebRtcPlayer.tsx", { "@/lib/auctions/whep-client": {} });
  const { LiveStreamPlayer } = load("components/Auction/LiveStreamPlayer.tsx", {
    "./CloudflareWebRtcPlayer": { CloudflareWebRtcPlayer }, "./YouTubeLivePlayer": { YouTubeLivePlayer: () => null },
    "@/lib/auctions/cloudflare-stream": cloudflare,
  });
  const stream = { provider: "cloudflare-webrtc", playbackUrl: url, status: "LIVE" };
  const active = renderToStaticMarkup(React.createElement(LiveStreamPlayer, { stream, title: "Leilão" }));
  assert.match(active, /Ativar som/);
  assert.match(active, /playsInline/);
  assert.match(active, /Conectando à transmissão/);
  assert.match(active, /O vídeo começará automaticamente/);
  assert.match(active, /aria-busy="true"/);
  assert.match(active, /rel="preconnect"/);
  assert.doesNotMatch(active, /Aguardando transmissão|sinal estiver disponível|Tentar novamente|Conectar novamente/);
  assert.doesNotMatch(active, /src="https:\/\/customer-/);
  const ended = renderToStaticMarkup(React.createElement(LiveStreamPlayer, { stream: { ...stream, status: "ENDED" }, title: "Leilão" }));
  assert.match(ended, /Transmissão encerrada/);
  assert.doesNotMatch(ended, /<video/);
});
