import { ClockIcon, LandmarkIcon, MapPinIcon, TrainFrontIcon, UtensilsIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ITEMS = [
  {
    slot: "Morning",
    time: "07:30",
    icon: LandmarkIcon,
    title: "Fushimi Inari before the crowds",
    meta: "2h 30m",
    cost: "Free",
    travel: "18 min by JR Nara line",
  },
  {
    slot: "Afternoon",
    time: "12:30",
    icon: UtensilsIcon,
    title: "Lunch crawl through Nishiki Market",
    meta: "1h 30m",
    cost: "$42",
    travel: "12 min walk",
  },
  {
    slot: "Afternoon",
    time: "15:00",
    icon: MapPinIcon,
    title: "Gion lanes and a tea ceremony",
    meta: "2h",
    cost: "$58",
    travel: "8 min walk",
  },
  {
    slot: "Evening",
    time: "19:00",
    icon: UtensilsIcon,
    title: "Kaiseki dinner in Pontocho",
    meta: "2h",
    cost: "$160",
  },
];

/** Static illustration of a planned day, used on the landing page. */
export function SampleDayCard() {
  return (
    <figure
      aria-label="Example of a planned day in Kyoto"
      className="bg-card relative rounded-xl border p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Day 3 · Tue 14 Apr
          </p>
          <p className="font-display mt-1 text-2xl font-semibold">Kyoto: shrines &amp; markets</p>
        </div>
        <Badge variant="estimate">Estimate</Badge>
      </div>

      <ol className="mt-5 space-y-0">
        {ITEMS.map((item, i) => (
          <li key={item.title} className="relative pl-12">
            <span className="bg-sea-wash text-primary absolute top-0 left-0 flex size-9 items-center justify-center rounded-full border">
              <item.icon className="size-4" aria-hidden="true" />
            </span>
            {i < ITEMS.length - 1 ? (
              <span
                aria-hidden="true"
                className="bg-border absolute top-9 bottom-0 left-[17px] w-px"
              />
            ) : null}
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                {item.slot} · {item.time}
              </p>
              <p className="text-sm font-semibold tabular-nums">{item.cost}</p>
            </div>
            <p className="font-medium">{item.title}</p>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
              <ClockIcon className="size-3" aria-hidden="true" />
              {item.meta}
            </p>
            {item.travel ? (
              <p className="bg-secondary text-secondary-foreground my-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs">
                <TrainFrontIcon className="size-3" aria-hidden="true" />
                {item.travel}
              </p>
            ) : (
              <div className="h-1" />
            )}
          </li>
        ))}
      </ol>

      <figcaption className="mt-3 flex items-center justify-between border-t pt-4 text-sm">
        <span className="text-muted-foreground">Day total for 2 travellers</span>
        <span className="font-semibold tabular-nums">$260</span>
      </figcaption>
    </figure>
  );
}
