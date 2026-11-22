import Link from "next/link";
import {
  BedDoubleIcon,
  CalendarIcon,
  CircleAlertIcon,
  CloudSunIcon,
  ExternalLinkIcon,
  InfoIcon,
  LandmarkIcon,
  PlaneIcon,
  StarIcon,
  TrainFrontIcon,
  UsersIcon,
  UtensilsIcon,
  WalletIcon,
} from "lucide-react";
import type { ItemType, PriceSource, VisaRequirement } from "@/generated/prisma/enums";
import { BUDGET_LABELS } from "@/lib/budget";
import { dueState } from "@/lib/checklist";
import { countryFlag, countryName } from "@/lib/countries";
import { formatDateRange, formatDay } from "@/lib/dates";
import { formatMoney } from "@/lib/money/currencies";
import { VISA_DISCLAIMER } from "@/lib/visa/official-sources";
import type { TripDetail } from "@/server/trips";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function checked(d: Date) {
  return formatDay(d, { year: "numeric" });
}

function PriceSourceBadge({ source, checkedAt }: { source: PriceSource; checkedAt: Date }) {
  return (
    <Badge variant={source === "LIVE" ? "live" : "estimate"}>
      {source === "LIVE" ? "Live" : "Estimate"}
      <span className="font-normal">· checked {checked(checkedAt)}</span>
    </Badge>
  );
}

const ITEM_ICON: Record<ItemType, typeof LandmarkIcon> = {
  ACTIVITY: LandmarkIcon,
  MEAL: UtensilsIcon,
  TRANSPORT: TrainFrontIcon,
  HOTEL: BedDoubleIcon,
};

const VISA_LABEL: Record<VisaRequirement, { label: string; tone: string }> = {
  NOT_REQUIRED: { label: "No visa needed", tone: "bg-live text-live-foreground" },
  VISA_ON_ARRIVAL: { label: "Visa on arrival", tone: "bg-estimate text-estimate-foreground" },
  E_VISA: { label: "Apply online before travel", tone: "bg-estimate text-estimate-foreground" },
  VISA_REQUIRED: { label: "Visa required", tone: "bg-destructive/10 text-destructive" },
  UNKNOWN: { label: "Check requirements", tone: "bg-secondary text-secondary-foreground" },
};

function Section({
  id,
  title,
  children,
  action,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 id={`${id}-heading`} className="text-2xl font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TripView({ detail }: { detail: TripDetail }) {
  const { trip, money, budget, flight, practicalInfo, isGuestTrip } = detail;
  const itemsCheckedAt = trip.days.flatMap((d) => d.items)[0]?.priceCheckedAt ?? trip.updatedAt;
  const overBudget = budget.remainingMinor < 0;

  return (
    <div className="space-y-12">
      {/* Header */}
      <header>
        <p className="text-terracotta-ink text-sm font-medium tracking-wide uppercase">
          {trip.countries.map((c) => `${countryFlag(c)} ${countryName(c)}`).join(" · ")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-balance sm:text-4xl">{trip.title}</h1>
        <ul className="text-muted-foreground mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li className="flex items-center gap-1.5">
            <CalendarIcon className="size-4" aria-hidden="true" />
            {trip.startDate && trip.endDate
              ? formatDateRange(trip.startDate, trip.endDate)
              : `${trip.lengthDays} days, flexible dates`}
          </li>
          <li className="flex items-center gap-1.5">
            <UsersIcon className="size-4" aria-hidden="true" />
            {trip.travellers} {trip.travellers === 1 ? "traveller" : "travellers"}
          </li>
          <li className="flex items-center gap-1.5">
            <WalletIcon className="size-4" aria-hidden="true" />
            Budget {formatMoney(trip.budgetMinor, trip.budgetCurrency)}
          </li>
        </ul>
        {isGuestTrip ? (
          <div className="border-terracotta/40 bg-accent mt-6 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <strong>This trip isn&apos;t saved yet.</strong> Guest trips are deleted after 7 days.
              Sign in to keep it.
            </p>
            <Button asChild size="sm">
              <Link href={`/signin?callbackUrl=${encodeURIComponent(`/trips/${trip.id}`)}`}>
                Sign in to save
              </Link>
            </Button>
          </div>
        ) : null}
        <nav
          aria-label="Trip sections"
          className="mt-6 flex gap-1 overflow-x-auto border-b pb-px text-sm"
        >
          {[
            ["budget", "Budget"],
            ["itinerary", "Itinerary"],
            ["stays", "Stays & flights"],
            ["visa", "Visa"],
            ["checklist", "Checklist"],
            ["info", "Practical info"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground shrink-0 rounded-t-md px-3 py-2"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      {/* Budget */}
      <Section id="budget" title="Budget">
        <Card>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-muted-foreground text-sm">Estimated total</p>
                <p className="font-display text-3xl font-semibold tabular-nums">
                  {formatMoney(budget.totalMinor, budget.currency)}
                </p>
              </div>
              <p
                className={cn(
                  "text-sm font-medium",
                  overBudget ? "text-destructive" : "text-live-foreground",
                )}
              >
                {overBudget
                  ? `${formatMoney(-budget.remainingMinor, budget.currency)} over your ${formatMoney(budget.budgetMinor, budget.currency)} budget`
                  : `${formatMoney(budget.remainingMinor, budget.currency)} under your ${formatMoney(budget.budgetMinor, budget.currency)} budget`}
              </p>
            </div>
            <div
              role="meter"
              aria-label="Share of budget used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(budget.usage * 100)}
              className="bg-secondary h-2.5 overflow-hidden rounded-full"
            >
              <div
                className={cn("h-full rounded-full", overBudget ? "bg-destructive" : "bg-primary")}
                style={{ width: `${Math.min(budget.usage * 100, 100)}%` }}
              />
            </div>
            <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {budget.lines.map((line) => (
                <div
                  key={line.category}
                  className="flex justify-between gap-4 border-b border-dashed py-1.5"
                >
                  <dt className="text-muted-foreground">
                    {BUDGET_LABELS[line.category]}
                    {line.category === "BUFFER" ? " (10% for surprises)" : ""}
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {formatMoney(line.amountMinor, budget.currency)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground text-xs">
              All amounts are estimates converted to {budget.currency} with sample exchange rates
              {trip.fxSnapshot ? ` checked ${checked(trip.fxSnapshot.fetchedAt)}` : ""}.
            </p>
          </CardContent>
        </Card>
      </Section>

      {/* Itinerary */}
      <Section
        id="itinerary"
        title="Itinerary"
        action={<PriceSourceBadge source="ESTIMATE" checkedAt={itemsCheckedAt} />}
      >
        <ol className="space-y-6">
          {trip.days.map((day) => {
            const dayTotal = day.items.reduce(
              (n, i) => n + money.convert(i.costMinor, i.currency),
              0,
            );
            return (
              <li key={day.id}>
                <Card className="gap-4">
                  <CardHeader>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Day {day.dayNumber}
                      {day.date ? ` · ${formatDay(day.date, { weekday: "short" })}` : ""}
                    </p>
                    <CardTitle className="text-xl">
                      <h3>{day.title}</h3>
                    </CardTitle>
                    {day.summary ? <CardDescription>{day.summary}</CardDescription> : null}
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-4">
                      {day.items.map((item) => {
                        const Icon = ITEM_ICON[item.type];
                        return (
                          <li key={item.id} className="grid grid-cols-[2.25rem_1fr_auto] gap-x-3">
                            <span className="bg-sea-wash text-primary flex size-9 items-center justify-center rounded-full border">
                              <Icon className="size-4" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              {item.travelModeFromPrev ? (
                                <p className="text-muted-foreground mb-1 text-xs">
                                  ↳ {item.travelModeFromPrev}
                                </p>
                              ) : null}
                              <p className="text-muted-foreground text-xs">
                                {item.startTime ?? item.slot.toLowerCase()}
                                {item.durationMin
                                  ? ` · ${item.durationMin >= 60 ? `${Math.floor(item.durationMin / 60)}h ${item.durationMin % 60 ? `${item.durationMin % 60}m` : ""}` : `${item.durationMin}m`}`
                                  : ""}
                              </p>
                              <p className="font-medium">{item.title}</p>
                              {item.description ? (
                                <p className="text-muted-foreground mt-0.5 text-sm">
                                  {item.description}
                                </p>
                              ) : null}
                              {item.notes ? (
                                <p className="text-terracotta-ink mt-1 flex items-start gap-1 text-xs">
                                  <InfoIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                                  {item.notes}
                                </p>
                              ) : null}
                            </div>
                            <p className="text-right text-sm font-semibold whitespace-nowrap tabular-nums">
                              {item.costMinor === 0
                                ? "Free"
                                : money.formatWithOriginal(item.costMinor, item.currency)}
                            </p>
                          </li>
                        );
                      })}
                    </ol>
                    <p className="mt-5 flex justify-between border-t pt-3 text-sm">
                      <span className="text-muted-foreground">Day total</span>
                      <span className="font-semibold tabular-nums">
                        {formatMoney(dayTotal, money.currency)}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* Stays & flights */}
      <Section id="stays" title="Stays & flights">
        <div className="space-y-6">
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
                {flight.notes ? (
                  <p className="text-muted-foreground text-sm">{flight.notes}</p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {trip.stops
            .filter((s) => s.hotels.length > 0)
            .map((stop) => (
              <div key={stop.id}>
                <h3 className="mb-3 flex items-center gap-2 font-sans text-base font-semibold tracking-normal">
                  <BedDoubleIcon className="text-primary size-4" aria-hidden="true" />
                  {stop.city}, {stop.nights} {stop.nights === 1 ? "night" : "nights"}
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
                        <CardContent className="space-y-2 px-5">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="secondary">
                              {{ BUDGET: "Budget", MID: "Mid-range", LUXURY: "Luxury" }[h.tier]}
                            </Badge>
                            {h.selected ? <Badge>Matches your style</Badge> : null}
                          </div>
                          <p className="font-medium">{h.name}</p>
                          <p className="text-muted-foreground text-sm">{h.area}</p>
                          {h.description ? (
                            <p className="text-muted-foreground text-sm">{h.description}</p>
                          ) : null}
                          <div className="flex items-end justify-between gap-2 pt-1">
                            <p className="text-sm">
                              <span className="font-semibold tabular-nums">
                                {money.format(h.nightlyMinor, h.currency)}
                              </span>
                              <span className="text-muted-foreground"> / night</span>
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
                            {checked(h.priceCheckedAt)}
                          </p>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </Section>

      {/* Visa */}
      <Section id="visa" title="Visa requirements">
        <div className="space-y-4">
          <p className="border-estimate-foreground/30 bg-estimate text-estimate-foreground flex items-start gap-2 rounded-lg border p-4 text-sm">
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>Verify before you travel.</strong> {VISA_DISCLAIMER}
            </span>
          </p>
          {trip.visas.length === 0 ? (
            <p className="text-muted-foreground">
              We couldn&apos;t look up visa rules for this trip. Check the destination&apos;s
              embassy.
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
                    <span
                      className={cn("rounded-md px-2.5 py-1 text-sm font-semibold", label.tone)}
                    >
                      {label.label}
                    </span>
                  </div>
                  <CardDescription>
                    For {countryName(v.nationality)} passport holders ·{" "}
                    {v.confidence === "CURATED"
                      ? `Curated summary, last reviewed ${checked(v.checkedAt)}`
                      : "AI estimate, not verified"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
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
      </Section>

      {/* Checklist */}
      <Section id="checklist" title="Pre-trip checklist">
        <Card className="py-2">
          <ul className="divide-y">
            {trip.checklist.map((c) => {
              const state = dueState(c.dueDate, c.done);
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                >
                  <div>
                    <p className="font-medium">{c.title}</p>
                    {c.description ? (
                      <p className="text-muted-foreground text-sm">{c.description}</p>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-sm whitespace-nowrap",
                      state === "overdue"
                        ? "text-destructive font-semibold"
                        : state === "soon"
                          ? "text-terracotta-ink font-semibold"
                          : "text-muted-foreground",
                    )}
                  >
                    {c.dueDate
                      ? `${state === "overdue" ? "Overdue: was due " : "By "}${formatDay(c.dueDate, { weekday: "short" })}`
                      : c.daysBeforeDeparture !== null
                        ? `${c.daysBeforeDeparture} days before you go`
                        : "Any time"}
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>
      </Section>

      {/* Practical info */}
      {practicalInfo ? (
        <Section id="info" title="Practical info">
          <div className="grid gap-4 md:grid-cols-2">
            {practicalInfo.weather.length ? (
              <Card className="gap-3 md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CloudSunIcon className="text-primary size-5" aria-hidden="true" />
                    <h3>Weather</h3>
                  </CardTitle>
                  <CardDescription>
                    {practicalInfo.weather[0]!.source}. Check a forecast closer to the date.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {practicalInfo.weather.map((w) => (
                      <li key={w.city} className="bg-secondary/60 rounded-lg p-3 text-sm">
                        <p className="font-medium">
                          {w.city}: {w.avgLowC}–{w.avgHighC}°C
                        </p>
                        <p className="text-muted-foreground">{w.summary}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
            <InfoCard title="Money">
              <p>
                <strong>{practicalInfo.currency.name}</strong> ({practicalInfo.currency.code}).{" "}
                {practicalInfo.currency.cashVsCard}
              </p>
              <p className="mt-2">
                <strong>Tipping:</strong> {practicalInfo.tipping}
              </p>
            </InfoCard>
            <InfoCard title="Getting around">
              <ul className="list-disc space-y-1 pl-5">
                {practicalInfo.localTransport.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </InfoCard>
            <InfoCard title="Staying safe">
              <ul className="list-disc space-y-1 pl-5">
                {practicalInfo.safety.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="mt-2">
                <strong>Emergency:</strong> {practicalInfo.emergencyNumber}
              </p>
            </InfoCard>
            <InfoCard title="Best areas to stay">
              {practicalInfo.bestAreas.map((b) => (
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
                <strong>Language:</strong> {practicalInfo.language}
              </p>
              <p className="mt-1">
                <strong>Plugs:</strong> {practicalInfo.plugType}
              </p>
              <p className="mt-1">
                <strong>Phone data:</strong> {practicalInfo.connectivity}
              </p>
            </InfoCard>
          </div>
        </Section>
      ) : null}
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
