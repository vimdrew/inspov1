import "@tanstack/react-start/server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const SAFE_PORTS = new Set([80, 443]);

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;

  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const lower = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (lower === "::" || lower === "::1") return true;

  const segments = lower.split(":");
  const first = parseInt(segments[0] || "0", 16) >>> 0;
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10

  // IPv4-mapped forms like ::ffff:192.168.0.1
  const last = segments[segments.length - 1];
  if (last.includes(".") && isPrivateIpv4(last)) return true;

  // IPv4-mapped forms normalized to hex, e.g. ::ffff:7f00:1 (127.0.0.1).
  // Only decode the trailing 32 bits when immediately preceded by "ffff",
  // otherwise ordinary public addresses like 2a04:4e42:35::347 would be
  // misread as embedded IPv4 and wrongly rejected.
  const nonEmpty = segments.filter(Boolean);
  const ffffMarker = nonEmpty[nonEmpty.length - 3];
  if (ffffMarker !== undefined && ffffMarker.toLowerCase() === "ffff" && nonEmpty.length >= 3) {
    const hi = parseInt(nonEmpty.at(-2)!, 16);
    const lo = parseInt(nonEmpty.at(-1)!, 16);
    if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
      const ipv4 = `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
      if (isPrivateIpv4(ipv4)) return true;
    }
  }

  return false;
}

function isPrivateAddress(address: string): boolean {
  const kind = isIP(address);
  if (kind === 4) return isPrivateIpv4(address);
  if (kind === 6) return isPrivateIpv6(address);
  return false; // treat unparseable address as non-IP (lookup should return real IPs)
}

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

/**
 * Rejects URLs that target non-public hosts. Every hop of an outbound fetch —
 * user-supplied input, redirect targets, and media CDN URLs — must pass this
 * check so a malicious short link cannot redirect to a private/loopback target
 * (e.g. cloud metadata endpoints) after an initial valid-looking URL.
 */
export async function assertSafeUrl(input: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UnsafeUrlError("Invalid URL");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UnsafeUrlError("Only http(s) URLs are supported");
  }

  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (!SAFE_PORTS.has(port)) {
    throw new UnsafeUrlError("Unsupported port");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new UnsafeUrlError("Private or reserved addresses are not allowed");
    }
    return url;
  }

  let addresses: string[];
  try {
    addresses = (await lookup(hostname, { all: true, order: "verbatim" })).map((r) => r.address);
  } catch {
    throw new UnsafeUrlError("Could not resolve host");
  }

  if (addresses.some(isPrivateAddress)) {
    throw new UnsafeUrlError("Private or reserved addresses are not allowed");
  }

  return url;
}

/**
 * GET that validates every redirect hop with `assertSafeUrl`. `fetch` runs with
 * `redirect: "manual"` so the platform's redirect chain cannot sneak past the
 * initial guard. Returns the final response together with the fully-resolved
 * URL it was fetched from.
 */
export async function fetchFollowingSafeRedirects(
  input: string,
  init?: RequestInit & { redirect?: "manual" },
  maxRedirects = 5,
): Promise<{ response: Response; url: string }> {
  let current = (await assertSafeUrl(input)).toString();

  for (let i = 0; i <= maxRedirects; i++) {
    const response = await fetch(current, {
      ...init,
      redirect: "manual",
      headers: init?.headers,
    });

    if (
      response.status >= 300 &&
      response.status < 400 &&
      !response.bodyUsed &&
      !response.redirected
    ) {
      const location = response.headers.get("location");
      if (!location) {
        return { response, url: current };
      }
      current = (await assertSafeUrl(new URL(location, current).toString())).toString();
      continue;
    }

    return { response, url: current };
  }

  throw new UnsafeUrlError("Too many redirects");
}
