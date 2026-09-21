import { describe, expect, it } from "vite-plus/test";

import { SlidingWindowLimiter } from "./rate-limit";

describe("SlidingWindowLimiter", () => {
  it("allows requests up to the limit", () => {
    const limiter = new SlidingWindowLimiter(60_000, 3);
    for (let i = 0; i < 3; i++) {
      expect(limiter.check("user-1")).toBe(true);
    }
  });

  it("blocks requests after the limit", () => {
    const limiter = new SlidingWindowLimiter(60_000, 3);
    for (let i = 0; i < 3; i++) limiter.check("user-1");
    expect(limiter.check("user-1")).toBe(false);
    expect(limiter.check("user-1")).toBe(false);
  });

  it("tracks users independently", () => {
    const limiter = new SlidingWindowLimiter(60_000, 2);
    limiter.check("user-1");
    limiter.check("user-1");
    expect(limiter.check("user-1")).toBe(false);
    expect(limiter.check("user-2")).toBe(true);
  });

  it("releases capacity after the window elapses", () => {
    const limiter = new SlidingWindowLimiter(50, 1);
    expect(limiter.check("user-1")).toBe(true);
    expect(limiter.check("user-1")).toBe(false);

    const now = Date.now;
    const realNow = now();
    Date.now = () => realNow + 100;

    try {
      expect(limiter.check("user-1")).toBe(true);
    } finally {
      Date.now = now;
    }
  });
});
