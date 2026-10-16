export const CLOUDFLARE_WEBRTC_PROVIDER = "cloudflare-webrtc";

export type CloudflareStreamSetup = {
  available: boolean;
  input: { id: string; playbackUrl: string; publishUrl: string } | null;
};

export function isCloudflareWebRtcPlaybackUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash &&
      /^customer-[a-z\d-]+\.cloudflarestream\.com$/i.test(url.hostname) &&
      /^\/[a-z\d_-]+\/webRTC\/play\/?$/i.test(url.pathname);
  } catch { return false; }
}
