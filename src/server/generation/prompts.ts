import { countryName } from "@/lib/countries";
import type { DayItem } from "./schemas";
import type { DayContext, TripBrief } from "./types";

/** Stable system prompt: identical across calls so it's served from the prompt cache. */
export const PLANNER_SYSTEM = `You are the trip planner inside Tripsmith, a travel-planning app. You produce realistic, well-paced plans that a traveller could actually follow.

How to plan:
- Fit the plan to the travellers: their interests, travel style (budget, mid-range or luxury), party size and overall budget.
- Pace days realistically. Group sights that are near each other, include travel time between stops, and leave breathing room. Aim for roughly 6–8 hours of planned activity on a full day, less on arrival and departure days.
- Respect how places work: many museums close one day a week, some sights need timed tickets, markets are best early. When a detail matters and you're not certain, add a short tip to check it.
- Prices are typical 2026 prices in the local currency for the whole party. The app labels every price as an estimate.
- Use real places. Don't invent businesses; if unsure of a specific name, describe the kind of place and area instead.

Hard rules:
- Never include URLs, phone numbers or email addresses.
- Don't state visa or entry rules; the app handles those separately with official sources.
- Write plainly and concisely. No marketing language, no emoji.`;

function fmtDate(d: Date | null) {
  return d
    ? d.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;
}

function briefLines(b: TripBrief): string {
  const when =
    b.startDate && b.endDate
      ? `${fmtDate(b.startDate)} to ${fmtDate(b.endDate)} (${b.lengthDays} days)`
      : `${b.lengthDays} days, dates flexible`;
  return [
    `Destination: ${b.surpriseMe ? "SURPRISE ME (you choose)" : b.destinationQuery}`,
    `Departing from: ${b.departureCity}`,
    `When: ${when}`,
    `Travellers: ${b.travellers}`,
    `Total budget: ${b.budgetMajor.toLocaleString("en")} ${b.budgetCurrency} for the whole party, including flights and accommodation`,
    `Travel style: ${{ BUDGET: "budget", MID: "mid-range", LUXURY: "luxury" }[b.style]}`,
    `Interests: ${b.interests.join(", ")}`,
    `Passport: ${countryName(b.nationality)}`,
  ].join("\n");
}

export function outlinePrompt(b: TripBrief): string {
  const nights = Math.max(b.lengthDays - 1, 0);
  return `Create the outline for this trip.

<trip>
${briefLines(b)}
</trip>

Requirements:
- "stops": the cities the traveller bases themselves in, in travel order. Their "nights" must add up to exactly ${nights}. Only add another city when it gives at least 2 nights there; prefer fewer bases over constant packing.
- "days": exactly ${b.lengthDays} entries, dayNumber 1 to ${b.lengthDays}, each pointing at the stop the traveller is in that day (stopIndex). Day 1 is arrival, so keep it light. Day ${b.lengthDays} is departure${b.lengthDays > 1 ? ", so plan only a morning" : ""}. A day that moves to a new city should say so in its title.${
    b.surpriseMe
      ? `
- You choose the destination. Pick one that suits the interests, style and budget, has good conditions in the travel month if known, and is practical for a ${countryName(b.nationality)} passport holder (favour easy entry).`
      : ""
  }
- "practical": currency name, card vs cash, main language, tipping norms, 3–5 safety notes, 3–5 local transport tips, 2–3 good areas to stay per city, plug type and voltage, emergency number(s), and SIM/eSIM options.
- "checklist": the steps to get ready, each with how many days before departure it should be done. Cover: entry/visa check (always include "check entry requirements", even if no visa is likely), flights, accommodation, travel insurance, phone data (SIM/eSIM), money (cards, notifying the bank, some local cash), health (vaccinations or medication only if relevant to the destination), booking popular attractions that sell out, offline maps and documents, and packing for the expected weather.`;
}

export function dayPrompt(d: DayContext): string {
  const lines = [
    `<trip>\n${briefLines(d.brief)}\n</trip>`,
    `Trip outline: ${d.outline.title}. ${d.outline.summary}`,
    `Plan day ${d.dayNumber} of ${d.brief.lengthDays}: "${d.dayTitle}". ${d.dayTheme}`,
    `City: ${d.stop.city}, ${countryName(d.stop.country)} (local currency ${d.stop.currency}).`,
  ];
  if (d.date) lines.push(`Date: ${fmtDate(d.date)}.`);
  if (d.weatherSummary) lines.push(`Typical weather: ${d.weatherSummary}`);
  if (d.hotelArea) lines.push(`Staying in: ${d.hotelArea}. Start and end the day near there.`);
  if (d.isArrivalDay)
    lines.push(
      `This is arrival day: start with a TRANSPORT item from the airport or station to the hotel, then keep the rest light.`,
    );
  if (d.fromStop)
    lines.push(
      `This is a travel day from ${d.fromStop.city} to ${d.stop.city}: include the intercity journey as a TRANSPORT item with a realistic cost and duration.`,
    );
  if (d.isDepartureDay)
    lines.push(
      `This is departure day: plan only a relaxed morning and finish with a TRANSPORT item to the airport.`,
    );
  if (d.alreadyPlanned.length)
    lines.push(`Already planned on other days (don't repeat): ${d.alreadyPlanned.join("; ")}.`);
  if (d.ideas?.activities.length) {
    const ideas = d.ideas.activities
      .map(
        (a) =>
          `- ${a.name} (${a.area}; ${a.categories.join("/")}; ~${a.durationMin} min; ~${a.costPerPersonMajor} ${a.currency} pp)`,
      )
      .join("\n");
    lines.push(`Curated ideas for ${d.stop.city} you can draw on when they fit:\n${ideas}`);
  }
  if (d.lockedItems.length) {
    const locked = d.lockedItems
      .map((i) => `- ${i.slot} ${i.startTime ?? ""} ${i.title}`)
      .join("\n");
    lines.push(
      `The traveller locked these items. Include them unchanged and plan around them:\n${locked}`,
    );
  }
  lines.push(`Requirements:
- 4 to 8 items in time order, covering MORNING, AFTERNOON and EVENING where the day allows.
- Include lunch and dinner as MEAL items (and breakfast only if it's an experience worth planning).
- Use TRANSPORT items only for real journeys (airport transfers, intercity trains, long taxi rides), not short hops; short hops go in travelMinFromPrev and travelModeFromPrev.
- costTotalMajor is for all ${d.brief.travellers} traveller(s) together, in ${d.stop.currency}. Free things cost 0.
- Give coordinates (lat/lng) for each place when you know them.`);
  return lines.join("\n\n");
}

export function alternativePrompt(d: DayContext, replace: DayItem, otherItems: DayItem[]): string {
  const kind = replace.type === "MEAL" ? "place to eat" : "activity";
  const schedule = otherItems
    .map((i) => `- ${i.startTime ?? i.slot} ${i.title} (${i.location})`)
    .join("\n");
  return [
    `<trip>\n${briefLines(d.brief)}\n</trip>`,
    `Day ${d.dayNumber} in ${d.stop.city}, ${countryName(d.stop.country)} (local currency ${d.stop.currency}).${d.date ? ` Date: ${fmtDate(d.date)}.` : ""}`,
    d.weatherSummary ? `Typical weather: ${d.weatherSummary}` : "",
    `The rest of the day:\n${schedule || "(nothing else planned)"}`,
    `The traveller wants to replace this ${kind}: "${replace.title}" (${replace.slot.toLowerCase()}, starting ${replace.startTime ?? "flexibly"}, about ${replace.durationMin} minutes, ${replace.location}).`,
    d.alreadyPlanned.length
      ? `Already planned on other days (don't suggest these): ${d.alreadyPlanned.join("; ")}.`
      : "",
    `Suggest exactly one different ${kind} that fits the same time slot, takes roughly the same time, suits their interests and travel style, and is near the rest of the day where possible. Use type "${replace.type}" and slot "${replace.slot}". costTotalMajor is for all ${d.brief.travellers} traveller(s), in ${d.stop.currency}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
