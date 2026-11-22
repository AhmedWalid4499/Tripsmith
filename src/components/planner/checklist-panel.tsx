"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { toggleChecklistItemAction } from "@/server/actions/planner";
import { dueState } from "@/lib/checklist";
import { formatDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

export type ChecklistEntry = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  daysBeforeDeparture: number | null;
  done: boolean;
};

const CATEGORY_LABEL: Record<string, string> = {
  VISA: "Visa",
  BOOKINGS: "Bookings",
  INSURANCE: "Insurance",
  CONNECTIVITY: "Phone & data",
  MONEY: "Money",
  HEALTH: "Health",
  PACKING: "Packing",
  OTHER: "Other",
};

export function ChecklistPanel({
  entries,
  hasDates,
}: {
  entries: ChecklistEntry[];
  hasDates: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(
    entries,
    (state, change: { id: string; done: boolean }) =>
      state.map((e) => (e.id === change.id ? { ...e, done: change.done } : e)),
  );
  const [, start] = useTransition();
  const doneCount = optimistic.filter((e) => e.done).length;

  const toggle = (entry: ChecklistEntry, done: boolean) =>
    start(async () => {
      setOptimistic({ id: entry.id, done });
      const r = await toggleChecklistItemAction(entry.id, done);
      if (r.error) toast.error(r.error);
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-semibold">
            {doneCount} of {optimistic.length}
          </span>{" "}
          done
        </p>
        <div
          role="meter"
          aria-label="Checklist progress"
          aria-valuemin={0}
          aria-valuemax={optimistic.length}
          aria-valuenow={doneCount}
          className="bg-sea-wash h-2 w-full max-w-xs overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full rounded-full transition-[width]"
            style={{ width: `${(doneCount / Math.max(optimistic.length, 1)) * 100}%` }}
          />
        </div>
      </div>
      {!hasDates ? (
        <p className="text-muted-foreground text-sm">
          Add travel dates to get exact deadlines; for now they count back from departure.
        </p>
      ) : null}
      <ul className="bg-card divide-y rounded-xl border">
        {optimistic.map((entry) => {
          const due = entry.dueDate ? new Date(entry.dueDate) : null;
          const state = dueState(due, entry.done);
          const id = `check-${entry.id}`;
          return (
            <li key={entry.id} className="flex items-start gap-3 px-4 py-4 sm:px-5">
              <Checkbox
                id={id}
                checked={entry.done}
                onCheckedChange={(v) => toggle(entry, v === true)}
                className="mt-0.5"
                aria-describedby={`${id}-due`}
              />
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={id}
                  className={cn(
                    "cursor-pointer font-medium",
                    entry.done && "text-muted-foreground line-through",
                  )}
                >
                  {entry.title}
                </label>
                {entry.description ? (
                  <p className={cn("text-muted-foreground text-sm", entry.done && "line-through")}>
                    {entry.description}
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-1 text-xs">
                  {CATEGORY_LABEL[entry.category] ?? entry.category}
                </p>
              </div>
              <p
                id={`${id}-due`}
                className={cn(
                  "shrink-0 text-right text-sm whitespace-nowrap",
                  state === "overdue"
                    ? "text-destructive font-semibold"
                    : state === "soon"
                      ? "text-terracotta-ink font-semibold"
                      : "text-muted-foreground",
                )}
              >
                {entry.done
                  ? "Done"
                  : due
                    ? `${state === "overdue" ? "Overdue · " : state === "soon" ? "Soon · " : "By "}${formatDay(due, { weekday: "short" })}`
                    : entry.daysBeforeDeparture !== null
                      ? `${entry.daysBeforeDeparture} days before`
                      : "Any time"}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
