import { createHmac } from "node:crypto";

type Environment = Record<string, string | undefined>;
export function voiceConfiguration(userId: string, env: Environment = process.env, now = Date.now()) {
  const iceServers: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const urls = (env.TURN_URLS ?? "").split(",").map(url => url.trim()).filter(Boolean);
  if (urls.some(url => !/^turns?:[^\s]+$/.test(url))) throw new Error("TURN_URLS must contain TURN URLs.");
  if (urls.length) {
    if (env.TURN_SHARED_SECRET) {
      const username = `${Math.floor(now / 1000) + 86400}:${userId}`;
      iceServers.push({ urls, username, credential: createHmac("sha1", env.TURN_SHARED_SECRET).update(username).digest("base64") });
    } else if (env.TURN_USERNAME && env.TURN_CREDENTIAL) {
      iceServers.push({ urls, username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL });
    } else throw new Error("TURN credentials are missing.");
  }
  return { iceServers, relayConfigured: urls.length > 0 };
}
