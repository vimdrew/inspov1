import { describe, expect, it } from "vite-plus/test";

import { randomOutfitName } from "./random-name";

describe("randomOutfitName", () => {
  it("returns an 'Adjective Noun' pair", () => {
    const name = randomOutfitName();
    expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it("varies across calls", () => {
    const names = new Set(Array.from({ length: 50 }, () => randomOutfitName()));
    expect(names.size).toBeGreaterThan(1);
  });
});
