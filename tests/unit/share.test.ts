import { describe, expect, it } from "vitest";
import { makeShareSlug, randomToken, SHARE_SLUG_PATTERN, slugify } from "@/lib/share";

describe("share slugs", () => {
  it("builds a readable prefix", () => {
    expect(slugify("7 days: Tokyo & Kyoto")).toBe("7-days-tokyo-kyoto");
    expect(slugify("Ça va? Côte d'Azur!")).toBe("ca-va-cote-d-azur");
    expect(slugify("A very long trip title that keeps going and going forever", 20)).toBe(
      "a-very-long-trip",
    );
  });

  it("appends an unguessable token and matches the route pattern", () => {
    const slug = makeShareSlug("7 days: Tokyo & Kyoto");
    expect(slug).toMatch(/^7-days-tokyo-kyoto-[0-9a-zA-Z]{12}$/);
    expect(SHARE_SLUG_PATTERN.test(slug)).toBe(true);
    expect(SHARE_SLUG_PATTERN.test(makeShareSlug("日本"))).toBe(true); // no ASCII prefix → token only
  });

  it("produces distinct tokens", () => {
    const tokens = new Set(Array.from({ length: 2000 }, () => randomToken()));
    expect(tokens.size).toBe(2000);
    expect([...tokens].every((t) => /^[0-9a-zA-Z]{12}$/.test(t))).toBe(true);
  });
});
