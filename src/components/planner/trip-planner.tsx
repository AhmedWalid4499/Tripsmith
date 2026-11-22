import Link from "next/link";
import { CalendarIcon, UsersIcon, WalletIcon } from "lucide-react";
import { countryFlag, countryName } from "@/lib/countries";
import { formatDateRange } from "@/lib/dates";
import type { RateTable } from "@/lib/money/convert";
import { formatMoney } from "@/lib/money/currencies";
import type { ProgressEvent } from "@/lib/progress-event";
import type { TripDetail } from "@/server/trips";
import { ChecklistPanel } from "@/components/planner/checklist-panel";
import { CurrencySwitch } from "@/components/planner/currency-switch";
import { ItineraryEditor, type EditorDay } from "@/components/planner/itinerary-editor";
import { BudgetPanel, InfoPanel, StaysPanel, VisaPanel } from "@/components/planner/panels";
import { PlannerTabs } from "@/components/planner/planner-tabs";
import { TripLiveProvider } from "@/components/planner/trip-live";
import { Button } from "@/components/ui/button";

export function TripPlanner({ detail }: { detail: TripDetail }) {
  const { trip, budget, isGuestTrip, latestJob } = detail;
  const rates = (trip.fxSnapshot?.rates as RateTable | undefined) ?? {};
  const stopById = new Map(trip.stops.map((s) => [s.id, s]));

  const days: EditorDay[] = trip.days.map((d) => ({
    id: d.id,
    dayNumber: d.dayNumber,
    date: d.date?.toISOString() ?? null,
    title: d.title,
    summary: d.summary,
    city: d.stopId ? (stopById.get(d.stopId)?.city ?? null) : null,
    items: d.items.map((i) => ({
      id: i.id,
      type: i.type,
      slot: i.slot,
      startTime: i.startTime,
      durationMin: i.durationMin,
      travelMinFromPrev: i.travelMinFromPrev,
      travelModeFromPrev: i.travelModeFromPrev,
      title: i.title,
      description: i.description,
      location: i.location,
      notes: i.notes,
      costMinor: i.costMinor,
      currency: i.currency,
      priceSource: i.priceSource,
      priceCheckedAt: i.priceCheckedAt.toISOString(),
      locked: i.locked,
    })),
  }));

  const initialEvent: ProgressEvent = {
    tripStatus: trip.status,
    job: latestJob
      ? {
          id: latestJob.id,
          kind: latestJob.kind,
          status: latestJob.status,
          params: (latestJob.params ?? null) as NonNullable<ProgressEvent["job"]>["params"],
          step: latestJob.step,
          progress: latestJob.progress,
          message: latestJob.message,
          error: latestJob.error,
        }
      : null,
  };
  const checklistDone = trip.checklist.filter((c) => c.done).length;
  const over = budget.remainingMinor < 0;

  return (
    <div className="space-y-8">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-terracotta-ink text-sm font-medium tracking-wide uppercase">
              {trip.countries.map((c) => `${countryFlag(c)} ${countryName(c)}`).join(" · ")}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-balance sm:text-4xl">{trip.title}</h1>
          </div>
          <CurrencySwitch tripId={trip.id} value={trip.displayCurrency} />
        </div>
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
            <span>
              {formatMoney(budget.totalMinor, budget.currency)} estimated of{" "}
              {formatMoney(budget.budgetMinor, budget.currency)}
              <span
                className={
                  over ? "text-destructive font-medium" : "text-live-foreground font-medium"
                }
              >
                {over ? " (over budget)" : " (within budget)"}
              </span>
            </span>
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
      </header>

      <TripLiveProvider tripId={trip.id} initial={initialEvent}>
        <PlannerTabs
          badges={{ checklist: `${checklistDone}/${trip.checklist.length}` }}
          panels={{
            itinerary: (
              <ItineraryEditor
                tripId={trip.id}
                days={days}
                rates={rates}
                displayCurrency={trip.displayCurrency}
              />
            ),
            stays: <StaysPanel detail={detail} />,
            visa: <VisaPanel detail={detail} />,
            checklist: (
              <ChecklistPanel
                hasDates={Boolean(trip.startDate)}
                entries={trip.checklist.map((c) => ({
                  id: c.id,
                  category: c.category,
                  title: c.title,
                  description: c.description,
                  dueDate: c.dueDate?.toISOString() ?? null,
                  daysBeforeDeparture: c.daysBeforeDeparture,
                  done: c.done,
                }))}
              />
            ),
            budget: <BudgetPanel detail={detail} />,
            info: <InfoPanel detail={detail} />,
          }}
        />
      </TripLiveProvider>
    </div>
  );
}
