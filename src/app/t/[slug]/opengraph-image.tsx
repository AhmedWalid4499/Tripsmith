import { ImageResponse } from "next/og";
import { countryName } from "@/lib/countries";
import { formatDateRange } from "@/lib/dates";
import { findSharedTrip, getSharedTripContent } from "@/server/share";
import { OG, OG_SIZE, OgCompass, ogFonts } from "@/server/og";

export const alt = "A trip plan made with Tripsmith";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Trim to a word boundary so the card never shows half a word. */
function shorten(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[,;:]$/, "")}…`;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shared = await findSharedTrip(slug);
  const fonts = await ogFonts();
  // A private or unknown link gets the generic card: never leak trip details.
  const trip = shared ? await getSharedTripContent(shared.id, false) : null;

  const firstDay = trip?.days[0];
  const meta = trip
    ? [
        trip.startDate && trip.endDate
          ? formatDateRange(trip.startDate, trip.endDate)
          : `${trip.lengthDays} days`,
        `${trip.travellers} ${trip.travellers === 1 ? "traveller" : "travellers"}`,
      ].join("  ·  ")
    : "";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: OG.paper,
        fontFamily: "Geist",
        color: OG.ink,
        padding: 64,
      }}
    >
      <div
        style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: trip ? 48 : 0 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <OgCompass />
          <span style={{ fontFamily: "Fraunces", fontSize: 34, fontWeight: 600 }}>Tripsmith</span>
        </div>
        {trip ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: 2,
                color: OG.terracotta,
                textTransform: "uppercase",
              }}
            >
              {trip.countries.map(countryName).join(" · ")}
            </span>
            <span
              style={{
                fontFamily: "Fraunces",
                fontSize: trip.title.length > 34 ? 60 : 72,
                fontWeight: 600,
                lineHeight: 1.05,
                marginTop: 14,
              }}
            >
              {trip.title}
            </span>
            <span style={{ fontSize: 26, color: OG.muted, marginTop: 22 }}>{meta}</span>
            <span style={{ fontSize: 26, color: OG.teal, fontWeight: 500, marginTop: 8 }}>
              {trip.stops.map((s) => s.city).join("  →  ")}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
            <span
              style={{ fontFamily: "Fraunces", fontSize: 76, fontWeight: 600, lineHeight: 1.05 }}
            >
              Plan the whole trip, not just the sightseeing.
            </span>
            <span style={{ fontSize: 28, color: OG.muted, marginTop: 24 }}>
              Itinerary, stays, visas, checklist and budget in one plan.
            </span>
          </div>
        )}
      </div>
      {firstDay ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 400,
            background: OG.card,
            border: `2px solid ${OG.border}`,
            borderRadius: 24,
            padding: 32,
            alignSelf: "center",
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: OG.muted,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Day 1
          </span>
          <span
            style={{
              fontFamily: "Fraunces",
              fontSize: 30,
              fontWeight: 600,
              marginTop: 6,
              lineHeight: 1.15,
            }}
          >
            {firstDay.title}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 22 }}>
            {firstDay.items.slice(0, 3).map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    background: OG.teal,
                    flexShrink: 0,
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 16, color: OG.muted }}>{item.startTime ?? ""}</span>
                  <span style={{ fontSize: 21, fontWeight: 500, lineHeight: 1.2 }}>
                    {shorten(item.title, 34)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>,
    { ...size, fonts },
  );
}
