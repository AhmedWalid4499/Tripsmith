/**
 * Smoke test: create a trip and run full generation in-process (no queue), then print a summary.
 * Usage: pnpm tsx-server scripts/smoke-generate.ts "Tokyo, Kyoto" 7 EG
 */
import "dotenv/config";
import { db } from "@/server/db";
import { runFullPlan } from "@/server/generation/orchestrator";

const [destination = "Tokyo, Kyoto", days = "7", nationality = "EG"] = process.argv.slice(2);
const start = new Date(Date.UTC(2027, 3, 10));
const lengthDays = Number(days);

const trip = await db.trip.create({
  data: {
    title: destination,
    destinationQuery: destination,
    departureCity: "Cairo",
    startDate: start,
    endDate: new Date(start.getTime() + (lengthDays - 1) * 86_400_000),
    lengthDays,
    travellers: 2,
    budgetMinor: 400_000,
    budgetCurrency: "USD",
    displayCurrency: "USD",
    style: "MID",
    interests: ["food", "history", "culture"],
    nationality,
    status: "QUEUED",
    jobs: { create: { kind: "FULL_PLAN" } },
  },
  include: { jobs: true },
});
const t0 = Date.now();
await runFullPlan(trip.jobs[0]!.id);
const full = await db.trip.findUniqueOrThrow({
  where: { id: trip.id },
  include: {
    stops: true,
    flights: true,
    visas: true,
    checklist: true,
    hotels: true,
    jobs: true,
    days: { orderBy: { dayNumber: "asc" }, include: { items: { orderBy: { order: "asc" } } } },
  },
});
console.log(
  `status=${full.status} job=${full.jobs[0]!.status} ${full.jobs[0]!.error ?? ""} (${Date.now() - t0} ms)`,
);
console.log(`title: ${full.title} | countries: ${full.countries.join(",")}`);
console.log(`stops: ${full.stops.map((s) => `${s.city} (${s.nights}n)`).join(" → ")}`);
console.log(
  `flight: ${full.flights.map((f) => `${f.fromCity}→${f.toCity} ${f.priceMinor / 100} ${f.currency} pp, ${f.durationMin}min`).join("")}`,
);
console.log(
  `hotels: ${full.hotels.map((h) => `${h.tier}${h.selected ? "*" : ""} ${h.name} ${h.nightlyMinor} ${h.currency}`).join(" | ")}`,
);
console.log(
  `visas: ${full.visas.map((v) => `${v.country}: ${v.requirement} (${v.confidence}) ${v.officialUrl}`).join(" | ")}`,
);
console.log(
  `checklist: ${full.checklist.length} items, first due ${full.checklist[0]?.dueDate?.toISOString().slice(0, 10)}`,
);
for (const d of full.days) {
  console.log(`Day ${d.dayNumber} ${d.date?.toISOString().slice(0, 10)}: ${d.title}`);
  for (const i of d.items)
    console.log(
      `   ${i.startTime} ${i.slot.padEnd(9)} ${i.type.padEnd(9)} ${i.title} [${i.costMinor} ${i.currency}]${i.travelModeFromPrev ? ` ← ${i.travelModeFromPrev}` : ""}`,
    );
}
process.exit(0);
