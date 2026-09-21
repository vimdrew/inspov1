import { describe, expect, it } from "vite-plus/test";

import { assertSafeUrl, UnsafeUrlError } from "./link-security";

describe("assertSafeUrl", () => {
  it("allows https on a public ip literal", async () => {
    const url = await assertSafeUrl("https://8.8.8.8/path");
    expect(url.hostname).toBe("8.8.8.8");
  });

  it("rejects loopback and cloud-metadata targets", async () => {
    for (const target of [
      "http://127.0.0.1/",
      "http://localhost:3000/x",
      "https://169.254.169.254/latest/meta-data/iam/security-credentials/",
      "http://10.0.0.1/",
      "http://192.168.1.1/",
      "http://172.16.0.1/",
    ]) {
      await expect(assertSafeUrl(target)).rejects.toBeInstanceOf(UnsafeUrlError);
    }
  });

  it("rejects ipv6 loopback and link-local targets", async () => {
    for (const target of ["https://[::1]/", "https://[::ffff:127.0.0.1]/", "https://[fe80::1]/"]) {
      await expect(assertSafeUrl(target)).rejects.toBeInstanceOf(UnsafeUrlError);
    }
  });

  it("allows public ipv6 addresses", async () => {
    for (const target of [
      "https://[2a04:4e42:35::347]/", // Fastly
      "https://[2606:4700:20::681a:41e]/", // Cloudflare
      "https://[::ffff:8.8.8.8]/", // IPv4-mapped public loopback-free
    ]) {
      await expect(assertSafeUrl(target)).resolves.toBeInstanceOf(URL);
    }
  });

  it("rejects disallowed schemes and ports", async () => {
    await expect(assertSafeUrl("ftp://8.8.8.8/")).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertSafeUrl("file:///etc/passwd")).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertSafeUrl("https://8.8.8.8:9999/")).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects malformed urls", async () => {
    await expect(assertSafeUrl("not a url")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});
