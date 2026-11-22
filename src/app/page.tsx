import Link from "next/link";
import {
  BedDoubleIcon,
  CalendarRangeIcon,
  ListChecksIcon,
  PiggyBankIcon,
  Share2Icon,
  StampIcon,
} from "lucide-react";
import { SampleDayCard } from "@/components/landing/sample-day-card";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: CalendarRangeIcon,
    title: "Day-by-day itinerary",
    body: "Morning, afternoon and evening plans with durations, costs and travel time between stops.",
  },
  {
    icon: BedDoubleIcon,
    title: "Hotels and flights",
    body: "Two or three stays per city at different price levels, plus a flight estimate from home.",
  },
  {
    icon: StampIcon,
    title: "Visa requirements",
    body: "What your passport needs, with a link to the official source. Always verify before you travel.",
  },
  {
    icon: ListChecksIcon,
    title: "Pre-trip checklist",
    body: "Visa, bookings, insurance, eSIM, currency and packing, with deadlines counted back from departure.",
  },
  {
    icon: PiggyBankIcon,
    title: "Budget breakdown",
    body: "Every cost by category, compared with your budget, in EGP, USD or EUR.",
  },
  {
    icon: Share2Icon,
    title: "Share or print",
    body: "A clean public link for your travel companions, and a layout that prints nicely.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Describe the trip",
    body: "Where, when, who's coming, your budget and what you love.",
  },
  {
    n: "2",
    title: "Get a full plan",
    body: "Watch it come together day by day, in under a couple of minutes.",
  },
  {
    n: "3",
    title: "Make it yours",
    body: "Swap activities, change hotels, move things around. Totals update.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 md:grid-cols-[1.1fr_1fr] md:items-center md:py-20">
          <div>
            <p className="text-terracotta-ink mb-4 text-sm font-medium tracking-wide uppercase">
              Your trip, fully planned
            </p>
            <h1 className="text-4xl leading-[1.05] font-semibold text-balance sm:text-5xl lg:text-6xl">
              Plan the whole trip, not just the sightseeing.
            </h1>
            <p className="text-muted-foreground mt-5 max-w-xl text-lg text-pretty">
              Tell Tripsmith where you&apos;re going and how you like to travel. You get an
              itinerary, stays, flights, visa requirements, a checklist and a budget, all editable
              and ready to share.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/plan/new">Plan a trip</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#how-it-works">How it works</Link>
              </Button>
            </div>
            <p className="text-muted-foreground mt-4 text-sm">
              No account needed for your first trip.
            </p>
          </div>
          <SampleDayCard />
        </div>
      </section>

      <section
        aria-labelledby="features-heading"
        className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6"
      >
        <h2 id="features-heading" className="text-3xl font-semibold">
          Everything you&apos;d otherwise piece together from twelve tabs
        </h2>
        <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="bg-sea-wash text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-5" />
              </span>
              <div>
                <h3 className="font-sans text-base font-semibold tracking-normal">{title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="how-it-works" aria-labelledby="how-heading" className="bg-card border-y">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="how-heading" className="text-3xl font-semibold">
            How it works
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="border-terracotta border-t-2 pt-5">
                <span className="font-display text-terracotta-ink text-sm font-semibold">
                  Step {s.n}
                </span>
                <h3 className="mt-1 text-xl font-semibold">{s.title}</h3>
                <p className="text-muted-foreground mt-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="bg-sea-wash flex flex-col items-start gap-6 rounded-xl border p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Honest about what&apos;s an estimate</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Every price is labelled <strong className="text-foreground">estimate</strong> or{" "}
              <strong className="text-foreground">live</strong>, with when it was last checked. Visa
              information always links to an official source, and we never present AI output as
              confirmed.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/plan/new">Start planning</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
