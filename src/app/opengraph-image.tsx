import { ImageResponse } from "next/og";
import { OG, OG_SIZE, OgCompass, ogFonts } from "@/server/og";

export const alt = "Tripsmith: plan the whole trip, not just the sightseeing";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: OG.paper,
        fontFamily: "Geist",
        color: OG.ink,
        padding: 72,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <OgCompass />
        <span style={{ fontFamily: "Fraunces", fontSize: 34, fontWeight: 600 }}>Tripsmith</span>
      </div>
      <span
        style={{
          fontFamily: "Fraunces",
          fontSize: 84,
          fontWeight: 600,
          lineHeight: 1.05,
          marginTop: "auto",
          maxWidth: 900,
        }}
      >
        Plan the whole trip, not just the sightseeing.
      </span>
      <span style={{ fontSize: 30, color: OG.muted, marginTop: 26 }}>
        Itinerary, stays, flights, visas, checklist and budget in one plan you can share.
      </span>
      <div
        style={{
          display: "flex",
          height: 8,
          width: 160,
          background: OG.terracotta,
          borderRadius: 4,
          marginTop: 36,
        }}
      />
    </div>,
    { ...size, fonts: await ogFonts() },
  );
}
