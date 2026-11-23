const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const SHARE_TOKEN_LENGTH = 12;

/** Unbiased random base62 string (rejection sampling over random bytes). */
export function randomToken(length = SHARE_TOKEN_LENGTH): string {
  let out = "";
  const limit = 256 - (256 % ALPHABET.length); // 248: bytes at or above this would bias the result
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      if (b < limit && out.length < length) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

/** "7 days: Tokyo & Kyoto" → "7-days-tokyo-kyoto" (ASCII, at most `max` chars, cut at a word boundary). */
export function slugify(text: string, max = 40): string {
  const slug = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max);
  return cut.includes("-") ? cut.slice(0, cut.lastIndexOf("-")) : cut;
}

/**
 * Public share slug: a readable prefix for humans plus an unguessable token.
 * Only the token matters for access; the prefix is cosmetic.
 */
export function makeShareSlug(title: string): string {
  const prefix = slugify(title);
  return prefix ? `${prefix}-${randomToken()}` : randomToken();
}

export const SHARE_SLUG_PATTERN = /^(?:[a-z0-9-]{1,40}-)?[0-9a-zA-Z]{12}$/;
