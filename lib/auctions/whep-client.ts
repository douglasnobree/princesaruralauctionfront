import { isCloudflareWebRtcPlaybackUrl } from "./cloudflare-stream";

export class WhepPlaybackError extends Error {
  constructor(public readonly status: number) {
    super("Não foi possível conectar à transmissão.");
    this.name = "WhepPlaybackError";
  }
}

function iceServersFromLinks(header: string | null): RTCIceServer[] {
  const servers: RTCIceServer[] = [];
  for (const match of (header ?? "").matchAll(/<([^>]+)>([^,]*)/g)) {
    if (!/;\s*rel="?ice-server"?(?:;|\s|$)/i.test(match[2]) || !/^(stun|stuns|turn|turns):/i.test(match[1])) continue;
    const parameter = (name: string) => new RegExp(`;\\s*${name}="([^"]*)"`, "i").exec(match[2])?.[1];
    const username = parameter("username");
    const credential = parameter("credential");
    servers.push({ urls: match[1], ...(username ? { username } : {}), ...(credential ? { credential } : {}) });
  }
  return servers;
}

function waitForIce(pc: RTCPeerConnection, signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      pc.removeEventListener("icegatheringstatechange", changed);
      signal.removeEventListener("abort", aborted);
    };
    const changed = () => { if (pc.iceGatheringState === "complete") { cleanup(); resolve(); } };
    const aborted = () => { cleanup(); reject(signal.reason); };
    pc.addEventListener("icegatheringstatechange", changed);
    signal.addEventListener("abort", aborted, { once: true });
    changed();
  });
}

export async function startWhepPlayback(playbackUrl: string, options: {
  signal: AbortSignal;
  discoverIceServers?: boolean;
  onStream: (stream: MediaStream) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
}): Promise<{ close: () => Promise<void> }> {
  if (!isCloudflareWebRtcPlaybackUrl(playbackUrl)) throw new Error("Endereço de reprodução inválido.");
  if (typeof RTCPeerConnection === "undefined" || typeof MediaStream === "undefined") {
    throw new Error("WEBRTC_UNSUPPORTED");
  }
  const operation = new AbortController();
  const media = new MediaStream();
  let pc: RTCPeerConnection | null = null;
  let sessionUrl: string | null = null;
  let closed = false;
  const timeout = setTimeout(() => operation.abort(), 15000);

  const close = async () => {
    const firstClose = !closed;
    closed = true;
    clearTimeout(timeout);
    options.signal.removeEventListener("abort", abort);
    operation.abort();
    if (pc) {
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      pc = null;
    }
    if (firstClose) for (const track of media.getTracks()) track.stop();
    const endpoint = sessionUrl;
    sessionUrl = null;
    if (endpoint) {
      await fetch(endpoint, { method: "DELETE", credentials: "omit", cache: "no-store", redirect: "error", keepalive: true }).catch(() => undefined);
    }
  };
  const abort = () => { operation.abort(); void close(); };
  options.signal.addEventListener("abort", abort, { once: true });

  try {
    if (options.signal.aborted) throw new DOMException("Aborted", "AbortError");
    // Cloudflare accepts the offer immediately; discover TURN/STUN only when retrying a failed connection.
    const discovery = options.discoverIceServers ? await fetch(playbackUrl, {
      method: "OPTIONS", credentials: "omit", cache: "no-store", redirect: "error", signal: operation.signal,
    }).catch(() => null) : null;
    operation.signal.throwIfAborted();
    pc = new RTCPeerConnection({ iceServers: iceServersFromLinks(discovery?.headers.get("Link") ?? null) });
    const peer = pc;
    peer.ontrack = ({ track }) => {
      if (closed) return;
      if (!media.getTracks().some((current) => current.id === track.id)) media.addTrack(track);
      options.onStream(media);
    };
    peer.onconnectionstatechange = () => { if (!closed) options.onConnectionState(peer.connectionState); };
    peer.addTransceiver("video", { direction: "recvonly" });
    peer.addTransceiver("audio", { direction: "recvonly" });
    await peer.setLocalDescription(await peer.createOffer());
    if (options.discoverIceServers) await waitForIce(peer, operation.signal);
    const response = await fetch(playbackUrl, {
      method: "POST", headers: { "Content-Type": "application/sdp", Accept: "application/sdp" },
      body: peer.localDescription?.sdp, credentials: "omit", cache: "no-store", redirect: "error", signal: operation.signal,
    });
    if (!response.ok) throw new WhepPlaybackError(response.status);
    const location = response.headers.get("Location");
    if (location) {
      const endpoint = new URL(location, playbackUrl);
      if (endpoint.origin === new URL(playbackUrl).origin && !endpoint.username && !endpoint.password) sessionUrl = endpoint.href;
    }
    if (closed || options.signal.aborted) throw new DOMException("Aborted", "AbortError");
    const answer = await response.text();
    if (!answer.trim().startsWith("v=0")) throw new Error("Resposta de reprodução inválida.");
    await peer.setRemoteDescription({ type: "answer", sdp: answer });
    clearTimeout(timeout);
    return { close };
  } catch (error) {
    await close();
    throw error;
  }
}
