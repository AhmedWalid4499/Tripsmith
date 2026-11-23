import Link from "next/link";
import {
  BedDoubleIcon,
  CalendarIcon,
  ClockIcon,
  CloudSunIcon,
  InfoIcon,
  LandmarkIcon,
  MapPinIcon,
  TrainFrontIcon,
  UsersIcon,
  UtensilsIcon,
} from "lucide-react";
import { countryFlag, countryName } from "@/lib/countries";
import { formatDateRange, formatDay } from "@/lib/dates";
import type { SharedTrip } from "@/server/share";
import { LogoMark } from "@/components/layout/logo";
import { PrintButton } from "@/components/share/print-button";
import { Button } from "@/components/ui/button";

const ICON = {
  ACTIVITY: LandmarkIcon,
  MEAL: UtensilsIcon,
  TRANSPORT: TrainFrontIcon,
  HOTEL: BedDoubleIcon,
};

function duration(min: number | null) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

export function SharedTripView({ trip }: { trip: SharedTrip }) {
  const route = trip.stops.map((s) => s.city).join(" → ");
  return (
    <article className="space-y-12 print:space-y-8">
      <header className="space-y-4">
        <p className="text-terracotta-ink text-sm font-medium tracking-wide uppercase">
          {trip.countries.map((c) => `${countryFlag(c)} ${countryName(c)}`).join(" · ")}
        </p>
        <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
          {trip.title}
        </h1>
        <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li className="flex items-center gap-1.5">
            <CalendarIcon className="size-4" aria-hidden="true" />
            {trip.startDate && trip.endDate
              ? formatDateRange(trip.startDate, trip.endDate)
              : `${trip.lengthDays} days`}
          </li>
          <li className="flex items-center gap-1.5">
            <UsersIcon className="size-4" aria-hidden="true" />
            {trip.travellers} {trip.travellers === 1 ? "traveller" : "travellers"}
          </li>
          <li className="flex items-center gap-1.5">
            <MapPinIcon className="size-4" aria-hidden="true" />
            {route}
          </li>
        </ul>
        <div className="flex flex-wrap gap-2 print:hidden">
          <PrintButton />
          <Button asChild variant="ghost" size="sm">
            <Link href="/plan/new">Plan your own trip</Link>
          </Button>
        </div>
      </header>

      {/* Where we're staying */}
      <section aria-labelledby="stays-heading" className="break-inside-avoid">
        <h2 id="stays-heading" className="text-2xl font-semibold">
          Where we&apos;re staying
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {trip.stops.map((s) => (
            <li
              key={`${s.city}-${s.nights}`}
              className="bg-card rounded-xl border p-4 print:border-neutral-300"
            >
              <p className="text-muted-foreground text-sm">
                {s.city}, {countryName(s.country)} · {s.nights}{" "}
                {s.nights === 1 ? "night" : "nights"}
              </p>
              {s.hotel ? (
                <>
                  <p className="mt-1 flex items-center gap-2 font-medium">
                    <BedDoubleIcon className="text-primary size-4" aria-hidden="true" />
                    {s.hotel.name}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {s.hotel.area}
                    {s.hotel.nightly ? ` · about ${s.hotel.nightly} a night` : ""}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground mt-1 text-sm">Accommodation to be decided.</p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Day by day */}
      <section aria-labelledby="days-heading">
        <h2 id="days-heading" className="text-2xl font-semibold">
          Day by day
        </h2>
        <ol className="mt-4 space-y-6">
          {trip.days.map((day) => (
            <li
              key={day.dayNumber}
              className="bg-card rounded-xl border print:break-inside-auto print:border-neutral-300"
            >
              <div className="break-after-avoid border-b px-5 py-4 sm:px-6 print:border-neutral-300">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Day {day.dayNumber}
                  {day.date ? ` · ${formatDay(day.date, { weekday: "long" })}` : ""}
                  {day.city ? ` · ${day.city}` : ""}
                </p>
                <h3 className="mt-1 text-xl font-semibold">{day.title}</h3>
                {day.summary ? (
                  <p className="text-muted-foreground mt-1 text-sm">{day.summary}</p>
                ) : null}
              </div>
              <ol className="space-y-4 px-5 py-4 sm:px-6">
                {day.items.map((item) => {
                  const Icon = ICON[item.type];
                  return (
                    <li key={item.id} className="break-inside-avoid">
                      {item.travelModeFromPrev ? (
                        <p className="text-muted-foreground mb-1 pl-12 text-xs">
                          ↳ {item.travelModeFromPrev}
                        </p>
                      ) : null}
                      <div className="grid grid-cols-[2.25rem_1fr] gap-x-3 sm:grid-cols-[2.25rem_1fr_auto]">
                        <span className="bg-sea-wash text-primary flex size-9 items-center justify-center rounded-full border print:bg-transparent">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                            {item.startTime ? (
                              <span className="tabular-nums">{item.startTime}</span>
                            ) : null}
                            {duration(item.durationMin) ? (
                              <span className="flex items-center gap-0.5">
                                <ClockIcon className="size-3" aria-hidden="true" />
                                {duration(item.durationMin)}
                              </span>
                            ) : null}
                          </p>
                          <p className="font-medium">{item.title}</p>
                          {item.location ? (
                            <p className="text-muted-foreground text-sm">{item.location}</p>
                          ) : null}
                          {item.description ? (
                            <p className="mt-0.5 text-sm">{item.description}</p>
                          ) : null}
                          {item.tip ? (
                            <p className="text-terracotta-ink mt-1 flex items-start gap-1 text-xs">
                              <InfoIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                              {item.tip}
                            </p>
                          ) : null}
                          {item.price ? (
                            <p className="mt-1 text-sm font-semibold tabular-nums sm:hidden">
                              {item.price}
                            </p>
                          ) : null}
                        </div>
                        {item.price ? (
                          <p className="hidden text-sm font-semibold whitespace-nowrap tabular-nums sm:block">
                            {item.price}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      </section>

      {trip.budget ? (
        <section aria-labelledby="budget-heading" className="break-inside-avoid">
          <h2 id="budget-heading" className="text-2xl font-semibold">
            Estimated cost
          </h2>
          <div className="bg-card mt-4 rounded-xl border p-5 print:border-neutral-300">
            <p>
              <span className="font-display text-3xl font-semibold tabular-nums">
                {trip.budget.total}
              </span>
              <span className="text-muted-foreground ml-2 text-sm">
                in total · about {trip.budget.perPerson} per person
              </span>
            </p>
            <dl className="mt-4 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              {trip.budget.lines.map((l) => (
                <div key={l.label} className="flex justify-between border-b border-dashed py-1">
                  <dt className="text-muted-foreground">{l.label}</dt>
                  <dd className="font-medium tabular-nums">{l.amount}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      {trip.practical ? (
        <section aria-labelledby="practical-heading" className="break-inside-avoid">
          <h2 id="practical-heading" className="text-2xl font-semibold">
            Good to know
          </h2>
          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            {trip.practical.weather.length ? (
              <div className="bg-card rounded-xl border p-4 sm:col-span-2 print:border-neutral-300">
                <p className="flex items-center gap-2 font-medium">
                  <CloudSunIcon className="text-primary size-4" aria-hidden="true" />
                  Weather
                </p>
                <ul className="mt-2 space-y-1">
                  {trip.practical.weather.map((w) => (
                    <li key={w.city}>
                      <strong>
                        {w.city}, {w.avgLowC}–{w.avgHighC}°C:
                      </strong>{" "}
                      {w.summary}
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-2 text-xs">
                  {trip.practical.weather[0]!.source}. Check a forecast closer to the date.
                </p>
              </div>
            ) : null}
            <div className="bg-card rounded-xl border p-4 print:border-neutral-300">
              <p className="font-medium">Money</p>
              <p className="mt-1">
                {trip.practical.currency.name} ({trip.practical.currency.code}).{" "}
                {trip.practical.currency.cashVsCard}
              </p>
              <p className="mt-1">
                <strong>Tipping:</strong> {trip.practical.tipping}
              </p>
            </div>
            <div className="bg-card rounded-xl border p-4 print:border-neutral-300">
              <p className="font-medium">Getting around</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {trip.practical.localTransport.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-xl border p-4 print:border-neutral-300">
              <p className="font-medium">Staying safe</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {trip.practical.safety.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="mt-1">
                <strong>Emergency:</strong> {trip.practical.emergencyNumber}
              </p>
            </div>
            <div className="bg-card rounded-xl border p-4 print:border-neutral-300">
              <p className="font-medium">Practicalities</p>
              <p className="mt-1">
                <strong>Language:</strong> {trip.practical.language}
              </p>
              <p className="mt-1">
                <strong>Plugs:</strong> {trip.practical.plugType}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="text-muted-foreground flex flex-col gap-4 border-t pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <LogoMark className="text-primary size-5" />
          Planned with Tripsmith.{" "}
          {trip.showCosts
            ? `Prices are estimates, last checked ${formatDay(trip.pricesCheckedAt, { year: "numeric" })}.`
            : ""}{" "}
          Check opening hours and bookings before you go.
        </p>
        <Button asChild size="sm" className="print:hidden">
          <Link href="/plan/new">Plan your own trip</Link>
        </Button>
      </footer>
    </article>
  );
}
