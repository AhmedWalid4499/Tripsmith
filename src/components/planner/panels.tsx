import {
  BedDoubleIcon,
  CheckIcon,
  CircleAlertIcon,
  CloudSunIcon,
  ExternalLinkIcon,
  PlaneIcon,
  StarIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type { PriceSource, VisaRequirement } from "@/generated/prisma/enums";
import { countryFlag, countryName } from "@/lib/countries";
import { formatDay } from "@/lib/dates";
import { formatMoney } from "@/lib/money/currencies";
import { VISA_DISCLAIMER } from "@/lib/visa/official-sources";
import type { TripDetail } from "@/server/trips";
import { cn } from "@/lib/utils";
import { ChooseHotelButton } from "@/components/planner/choose-hotel-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function checkedLabel(d: Date) {
  return formatDay(d, { year: "numeric" });
}

export function PriceSourceBadge({ source, checkedAt }: { source: PriceSource; checkedAt: Date }) {
  return (
    <Badge variant={source === "LIVE" ? "live" : "estimate"}>
      {source === "LIVE" ? "Live" : "Estimate"}
      <span className="font-normal">· checked {checkedLabel(checkedAt)}</span>
    </Badge>
  );
}

// ───────────────────────────── Budget ─────────────────────────────

export function BudgetPanel({ detail }: { detail: TripDetail }) {
  const { budget, trip } = detail;
  const c = budget.currency;
  const over = budget.remainingMinor < 0;
  const pct = Math.round(budget.usage * 100);
  const lines = [
    ...budget.lines
      .filter((l) => l.category !== "BUFFER")
      .sort((a, b) => b.amountMinor - a.amountMinor),
    ...budget.lines.filter((l) => l.category === "BUFFER"),
  ];
  const max = Math.max(...lines.map((l) => l.amountMinor), 1);
  const perPerson = Math.round(budget.totalMinor / trip.travellers);
  const perDay = Math.round(budget.totalMinor / trip.lengthDays);

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Estimated total", formatMoney(budget.totalMinor, c)],
          ["Per person", formatMoney(perPerson, c)],
          ["Per day", formatMoney(perDay, c)],
          [
            over ? "Over budget" : "Left in budget",
            formatMoney(Math.abs(budget.remainingMinor), c),
          ],
        ].map(([label, value], i) => (
          <div key={label} className="bg-card rounded-xl border p-4">
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd
              className={cn(
                "font-display mt-1 text-2xl font-semibold tabular-nums",
                i === 3 && over && "text-destructive",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <Card className="gap-5">
        <CardHeader>
          <CardTitle>
            <h3>Against your budget</h3>
          </CardTitle>
          <CardDescription>
            {formatMoney(budget.totalMinor, c)} estimated of {formatMoney(budget.budgetMinor, c)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            role="meter"
            aria-label="Estimated cost as a share of your budget"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(pct, 100)}
            aria-valuetext={`${pct}% of budget`}
            className="bg-sea-wash h-3 overflow-hidden rounded-full"
          >
            <div
              className={cn("h-full rounded-r-[4px]", over ? "bg-destructive" : "bg-primary")}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              over ? "text-destructive" : "text-live-foreground",
            )}
          >
            {over ? (
              <TriangleAlertIcon className="size-4" aria-hidden="true" />
            ) : (
              <CheckIcon className="size-4" aria-hidden="true" />
            )}
            {over
              ? `${pct}% of budget: ${formatMoney(-budget.remainingMinor, c)} over. Try a cheaper hotel or swap paid activities.`
              : `${pct}% of budget: ${formatMoney(budget.remainingMinor, c)} to spare.`}
          </p>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>
            <h3>Where the money goes</h3>
          </CardTitle>
          <CardDescription>
            Largest first. Hover or focus a row for per-person and per-day figures.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full border-separate border-spacing-y-1 text-sm">
            <caption className="sr-only">Estimated cost by category in {c}</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Share of total</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const share = budget.totalMinor
                  ? Math.round((line.amountMinor / budget.totalMinor) * 100)
                  : 0;
                return (
                  <tr
                    key={line.category}
                    tabIndex={0}
                    className="group hover:bg-secondary/60 focus-visible:ring-ring/40 rounded-md outline-none focus-visible:ring-[3px]"
                  >
                    <th
                      scope="row"
                      className="text-muted-foreground w-32 py-2 pr-3 text-left font-normal sm:w-40"
                    >
                      {line.label}
                      {line.category === "BUFFER" ? (
                        <span className="block text-xs">10% for surprises</span>
                      ) : null}
                    </th>
                    <td className="relative py-2 pr-3">
                      <div className="h-3 w-full" aria-hidden="true">
                        <div
                          className={cn(
                            "h-3 rounded-r-[4px]",
                            line.category === "BUFFER" ? "bg-primary/35" : "bg-primary",
                          )}
                          style={{ width: `${Math.max((line.amountMinor / max) * 100, 1)}%` }}
                        />
                      </div>
                      <span className="sr-only">{share}% of total</span>
                      <span
                        role="tooltip"
                        className="bg-popover text-popover-foreground pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 rounded-md border px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md group-hover:block group-focus-visible:block"
                      >
                        {share}% of total ·{" "}
                        {formatMoney(Math.round(line.amountMinor / trip.travellers), c)} per person
                        · {formatMoney(Math.round(line.amountMinor / trip.lengthDays), c)} per day
                      </span>
                    </td>
                    <td className="w-24 py-2 text-right font-medium whitespace-nowrap tabular-nums">
                      {formatMoney(line.amountMinor, c)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-muted-foreground mt-4 text-xs">
            Flights are round trip for {trip.travellers}{" "}
            {trip.travellers === 1 ? "traveller" : "travellers"}; hotels are your chosen stays for
            every night; visa fees are per person. All figures are estimates converted to {c} with
            sample exchange rates
            {trip.fxSnapshot ? ` checked ${checkedLabel(trip.fxSnapshot.fetchedAt)}` : ""}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────────────── Stays & flights ─────────────────────────────

const TIER_LABEL = { BUDGET: "Budget", MID: "Mid-range", LUXURY: "Luxury" } as const;

export function StaysPanel({ detail }: { detail: TripDetail }) {
  const { trip, money, flight } = detail;
  return (
    <div className="space-y-8">
      {flight ? (
        <Card className="gap-3">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <PlaneIcon className="text-primary size-5" aria-hidden="true" />
                <h3>Flights</h3>
              </CardTitle>
              <PriceSourceBadge source={flight.priceSource} checkedAt={flight.priceCheckedAt} />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-medium">
              {flight.fromCity} → {flight.toCity} {flight.roundTrip ? "(round trip)" : ""}
            </p>
            <p className="text-muted-foreground text-sm">
              {money.format(flight.priceMinor, flight.currency)} per traveller ·{" "}
              {money.format(flight.priceMinor * trip.travellers, flight.currency)} total
              {flight.durationMin
                ? ` · about ${Math.round(flight.durationMin / 60)}h each way`
                : ""}
              {flight.stops !== null
                ? ` · ${flight.stops === 0 ? "direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}`
                : ""}
            </p>
            {flight.notes ? <p className="text-muted-foreground text-sm">{flight.notes}</p> : null}
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground">No flight estimate for this trip.</p>
      )}

      {trip.stops
        .filter((s) => s.hotels.length > 0)
        .map((stop) => (
          <section key={stop.id} aria-labelledby={`stay-${stop.id}`}>
            <h3
              id={`stay-${stop.id}`}
              className="mb-3 flex items-center gap-2 font-sans text-base font-semibold tracking-normal"
            >
              <BedDoubleIcon className="text-primary size-4" aria-hidden="true" />
              {stop.city}: {stop.nights} {stop.nights === 1 ? "night" : "nights"}
            </h3>
            <ul className="grid gap-3 md:grid-cols-3">
              {stop.hotels.map((h) => (
                <li key={h.id}>
                  <Card
                    className={cn(
                      "h-full gap-3 py-5",
                      h.selected && "border-primary ring-primary ring-1",
                    )}
                  >
                    <CardContent className="flex h-full flex-col gap-2 px-5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary">{TIER_LABEL[h.tier]}</Badge>
                        {h.selected ? (
                          <Badge>
                            <CheckIcon aria-hidden="true" />
                            Your pick
                          </Badge>
                        ) : null}
                      </div>
                      <p className="font-medium">{h.name}</p>
                      <p className="text-muted-foreground text-sm">{h.area}</p>
                      {h.description ? (
                        <p className="text-muted-foreground text-sm">{h.description}</p>
                      ) : null}
                      <div className="mt-auto space-y-3 pt-2">
                        <div className="flex items-end justify-between gap-2">
                          <p className="text-sm">
                            <span className="font-semibold tabular-nums">
                              {money.format(h.nightlyMinor, h.currency)}
                            </span>
                            <span className="text-muted-foreground"> / night</span>
                            <span className="text-muted-foreground block text-xs">
                              {money.format(h.nightlyMinor * stop.nights, h.currency)} for{" "}
                              {stop.nights} {stop.nights === 1 ? "night" : "nights"}
                            </span>
                          </p>
                          {h.rating ? (
                            <p className="text-muted-foreground flex items-center gap-1 text-xs">
                              <StarIcon className="size-3 fill-current" aria-hidden="true" />
                              {h.rating.toFixed(1)}
                              <span className="sr-only">out of 5</span>
                            </p>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {h.priceSource === "LIVE" ? "Live" : "Estimate"} · checked{" "}
                          {checkedLabel(h.priceCheckedAt)}
                        </p>
                        {!h.selected ? <ChooseHotelButton hotelId={h.id} name={h.name} /> : null}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

// ───────────────────────────── Visa ─────────────────────────────

const VISA_LABEL: Record<VisaRequirement, { label: string; tone: string }> = {
  NOT_REQUIRED: { label: "No visa needed", tone: "bg-live text-live-foreground" },
  VISA_ON_ARRIVAL: { label: "Visa on arrival", tone: "bg-estimate text-estimate-foreground" },
  E_VISA: { label: "Apply online before travel", tone: "bg-estimate text-estimate-foreground" },
  VISA_REQUIRED: { label: "Visa required", tone: "bg-destructive/10 text-destructive" },
  UNKNOWN: { label: "Check requirements", tone: "bg-secondary text-secondary-foreground" },
};

export function VisaPanel({ detail }: { detail: TripDetail }) {
  const { trip, money } = detail;
  return (
    <div className="space-y-4">
      <p className="border-estimate-foreground/30 bg-estimate text-estimate-foreground flex items-start gap-2 rounded-lg border p-4 text-sm">
        <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          <strong>Verify before you travel.</strong> {VISA_DISCLAIMER}
        </span>
      </p>
      {trip.visas.length === 0 ? (
        <p className="text-muted-foreground">
          We couldn&apos;t look up visa rules for this trip. Check the destination&apos;s embassy.
        </p>
      ) : null}
      {trip.visas.map((v) => {
        const label = VISA_LABEL[v.requirement];
        return (
          <Card key={v.id} className="gap-4">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>
                  <h3>
                    {countryFlag(v.country)} {countryName(v.country)}
                  </h3>
                </CardTitle>
                <span className={cn("rounded-md px-2.5 py-1 text-sm font-semibold", label.tone)}>
                  {label.label}
                </span>
              </div>
              <CardDescription>
                For {countryName(v.nationality)} passport holders ·{" "}
                {v.confidence === "CURATED"
                  ? `Curated summary, last reviewed ${checkedLabel(v.checkedAt)}`
                  : "AI estimate, not verified"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {v.visaType ? (
                  <div>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="font-medium">{v.visaType}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted-foreground">Estimated cost</dt>
                  <dd className="font-medium">
                    {v.costMinor !== null && v.currency
                      ? `${money.formatWithOriginal(v.costMinor, v.currency)} per person`
                      : "Varies or free; check the official source"}
                  </dd>
                </div>
                {v.processingTime ? (
                  <div>
                    <dt className="text-muted-foreground">Processing time</dt>
                    <dd className="font-medium">{v.processingTime}</dd>
                  </div>
                ) : null}
                {v.maxStayDays ? (
                  <div>
                    <dt className="text-muted-foreground">Typical maximum stay</dt>
                    <dd className="font-medium">{v.maxStayDays} days</dd>
                  </div>
                ) : null}
              </dl>
              {v.documents.length ? (
                <div>
                  <p className="text-muted-foreground">Documents usually required</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {v.documents.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {v.notes ? <p>{v.notes}</p> : null}
              {v.officialUrl ? (
                <Button asChild variant="outline" size="sm">
                  <a href={v.officialUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon />
                    {v.officialSourceName ?? "Official source"}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Button>
              ) : (
                <p className="text-muted-foreground">
                  No official link on file. Check the website of the {countryName(v.country)}{" "}
                  embassy or consulate in your country.
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ───────────────────────────── Practical info ─────────────────────────────

export function InfoPanel({ detail }: { detail: TripDetail }) {
  const info = detail.practicalInfo;
  if (!info) return <p className="text-muted-foreground">No practical info for this trip yet.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="gap-3 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudSunIcon className="text-primary size-5" aria-hidden="true" />
            <h3>Weather</h3>
          </CardTitle>
          {info.weather.length ? (
            <CardDescription>
              {info.weather[0]!.source}. Check a forecast closer to the date.
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {info.weather.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {info.weather.map((w) => (
                <li key={w.city} className="bg-secondary/60 rounded-lg p-3 text-sm">
                  <p className="font-medium">
                    {w.city}: {w.avgLowC}–{w.avgHighC}°C
                  </p>
                  <p className="text-muted-foreground">{w.summary}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Add travel dates to see typical weather for your trip.
            </p>
          )}
        </CardContent>
      </Card>
      <InfoCard title="Money">
        <p>
          <strong>{info.currency.name}</strong> ({info.currency.code}). {info.currency.cashVsCard}
        </p>
        <p className="mt-2">
          <strong>Tipping:</strong> {info.tipping}
        </p>
      </InfoCard>
      <InfoCard title="Getting around">
        <ul className="list-disc space-y-1 pl-5">
          {info.localTransport.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </InfoCard>
      <InfoCard title="Staying safe">
        <ul className="list-disc space-y-1 pl-5">
          {info.safety.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="mt-2">
          <strong>Emergency:</strong> {info.emergencyNumber}
        </p>
      </InfoCard>
      <InfoCard title="Best areas to stay">
        {info.bestAreas.map((b) => (
          <div key={b.city} className="mb-2 last:mb-0">
            <p className="font-medium">{b.city}</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {b.areas.map((a) => (
                <li key={a.name}>
                  <strong>{a.name}:</strong> {a.why}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </InfoCard>
      <InfoCard title="Good to know">
        <p>
          <strong>Language:</strong> {info.language}
        </p>
        <p className="mt-1">
          <strong>Plugs:</strong> {info.plugType}
        </p>
        <p className="mt-1">
          <strong>Phone data:</strong> {info.connectivity}
        </p>
      </InfoCard>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>
          <h3 className="text-lg">{title}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}
