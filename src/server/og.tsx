import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Satori (ImageResponse) can't read OKLCH, so the brand tokens are repeated here as hex.
export const OG = {
  paper: "#FBF8F2",
  card: "#FFFFFF",
  ink: "#1C2434",
  muted: "#5B6270",
  teal: "#0E5E5E",
  seaWash: "#E3F2F1",
  terracotta: "#B4532F",
  border: "#E4DED3",
} as const;

export const OG_SIZE = { width: 1200, height: 630 };

const fontDir = join(process.cwd(), "src/assets/fonts");
let fonts:
  Promise<{ name: string; data: Buffer; weight: 400 | 500 | 600; style: "normal" }[]> | undefined;

export function ogFonts() {
  fonts ??= Promise.all([
    readFile(join(fontDir, "fraunces-latin-600-normal.woff")).then((data) => ({
      name: "Fraunces",
      data,
      weight: 600 as const,
      style: "normal" as const,
    })),
    readFile(join(fontDir, "geist-sans-latin-400-normal.woff")).then((data) => ({
      name: "Geist",
      data,
      weight: 400 as const,
      style: "normal" as const,
    })),
    readFile(join(fontDir, "geist-sans-latin-500-normal.woff")).then((data) => ({
      name: "Geist",
      data,
      weight: 500 as const,
      style: "normal" as const,
    })),
  ]);
  return fonts;
}

export function OgCompass({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke={OG.teal} strokeWidth="1.5" />
      <path d="M16 4 L19 16 L16 14.5 L13 16 Z" fill={OG.terracotta} />
      <path d="M16 28 L13 16 L16 17.5 L19 16 Z" fill={OG.teal} />
      <path d="M4 16 L16 13 L14.5 16 L16 19 Z" fill={OG.teal} opacity="0.35" />
      <path d="M28 16 L16 19 L17.5 16 L16 13 Z" fill={OG.teal} opacity="0.35" />
    </svg>
  );
}
