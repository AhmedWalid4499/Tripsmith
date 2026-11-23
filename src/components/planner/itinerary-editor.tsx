"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BedDoubleIcon,
  CalendarDaysIcon,
  ClockIcon,
  GripVerticalIcon,
  InfoIcon,
  LandmarkIcon,
  LoaderCircleIcon,
  LockIcon,
  LockOpenIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  ShuffleIcon,
  TrainFrontIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UtensilsIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  moveItemToDayAction,
  regenerateDayAction,
  removeItemAction,
  reorderItemsAction,
  setItemLockedAction,
  swapItemAction,
  type ActionResult,
} from "@/server/actions/planner";
import { formatDay } from "@/lib/dates";
import type { RateTable } from "@/lib/money/convert";
import { formatMoney } from "@/lib/money/currencies";
import { moneyFormatter } from "@/lib/money/display";
import { parseHHMM, retimeDay } from "@/lib/retime";
import { cn } from "@/lib/utils";
import { useTripLive } from "@/components/planner/trip-live";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type EditorItem = {
  id: string;
  type: "ACTIVITY" | "MEAL" | "TRANSPORT" | "HOTEL";
  slot: "MORNING" | "AFTERNOON" | "EVENING";
  startTime: string | null;
  durationMin: number | null;
  travelMinFromPrev: number | null;
  travelModeFromPrev: string | null;
  title: string;
  description: string | null;
  location: string | null;
  notes: string | null;
  costMinor: number;
  currency: string;
  priceSource: "ESTIMATE" | "LIVE";
  priceCheckedAt: string;
  locked: boolean;
};

export type EditorDay = {
  id: string;
  dayNumber: number;
  date: string | null;
  title: string;
  summary: string | null;
  city: string | null;
  items: EditorItem[];
};

const ITEM_ICON = {
  ACTIVITY: LandmarkIcon,
  MEAL: UtensilsIcon,
  TRANSPORT: TrainFrontIcon,
  HOTEL: BedDoubleIcon,
};

function formatDuration(min: number | null) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

function dayLabel(day: EditorDay) {
  return `Day ${day.dayNumber}${day.date ? ` (${formatDay(new Date(day.date), { weekday: "short" })})` : ""}`;
}

/** Recompute times locally exactly as the server will, so the UI doesn't jump after saving. */
function retimeColumns(
  before: EditorDay[],
  after: EditorDay[],
  changedDayIds: Set<string>,
): EditorDay[] {
  const prevOf = new Map<string, string | null>();
  for (const d of before)
    d.items.forEach((item, i) => prevOf.set(item.id, d.items[i - 1]?.id ?? null));
  const homeDay = new Map(before.flatMap((d) => d.items.map((i) => [i.id, d.id] as const)));
  return after.map((day) => {
    if (!changedDayIds.has(day.id)) return day;
    const timed = retimeDay(
      day.items.map((item) => ({
        ...item,
        previousPredecessorId:
          homeDay.get(item.id) === day.id ? (prevOf.get(item.id) ?? null) : null,
      })),
    );
    return { ...day, items: day.items.map((item, i) => ({ ...item, ...timed[i]!, id: item.id })) };
  });
}

export function ItineraryEditor({
  tripId,
  days,
  rates,
  displayCurrency,
}: {
  tripId: string;
  days: EditorDay[];
  rates: RateTable;
  displayCurrency: string;
}) {
  const live = useTripLive();
  const money = useMemo(() => moneyFormatter(rates, displayCurrency), [rates, displayCurrency]);
  const [columns, setColumns] = useState(days);
  const [serverDays, setServerDays] = useState(days);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmRegen, setConfirmRegen] = useState<EditorDay | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<EditorItem | null>(null);
  const snapshot = useRef<EditorDay[]>(days);

  // Fresh server data (after any save or job) replaces local state.
  if (days !== serverDays && activeId === null) {
    setServerDays(days);
    setColumns(days);
  }

  const locked = live.busy || pending;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findDay = (cols: EditorDay[], id: UniqueIdentifier) =>
    cols.find((d) => d.id === id || d.items.some((i) => i.id === id));
  const findItem = (id: UniqueIdentifier) =>
    columns.flatMap((d) => d.items).find((i) => i.id === id);

  const run = (label: string, action: () => Promise<ActionResult>, onError?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        onError?.();
      } else if (label) {
        toast.success(label);
      }
    });

  const onDragStart = ({ active }: DragStartEvent) => {
    snapshot.current = columns;
    setActiveId(active.id);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    setColumns((cols) => {
      const from = findDay(cols, active.id);
      const to = findDay(cols, over.id);
      if (!from || !to || from.id === to.id) return cols;
      const item = from.items.find((i) => i.id === active.id)!;
      const overIndex = to.items.findIndex((i) => i.id === over.id);
      const insertAt = overIndex === -1 ? to.items.length : overIndex;
      return cols.map((d) => {
        if (d.id === from.id) return { ...d, items: d.items.filter((i) => i.id !== active.id) };
        if (d.id === to.id)
          return { ...d, items: [...d.items.slice(0, insertAt), item, ...d.items.slice(insertAt)] };
        return d;
      });
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    const before = snapshot.current;
    if (!over) return setColumns(before);

    let next = columns;
    const day = findDay(next, active.id);
    if (day) {
      const oldIndex = day.items.findIndex((i) => i.id === active.id);
      const newIndex = day.items.findIndex((i) => i.id === over.id);
      if (newIndex !== -1 && oldIndex !== newIndex) {
        next = next.map((d) =>
          d.id === day.id ? { ...d, items: arrayMove(d.items, oldIndex, newIndex) } : d,
        );
      }
    }

    const changed = next.filter((d) => {
      const prev = before.find((b) => b.id === d.id);
      return prev && prev.items.map((i) => i.id).join() !== d.items.map((i) => i.id).join();
    });
    if (changed.length === 0) return setColumns(before);

    const changedIds = new Set(changed.map((d) => d.id));
    setColumns(retimeColumns(before, next, changedIds));
    run(
      "",
      () =>
        reorderItemsAction(
          tripId,
          changed.map((d) => ({ dayId: d.id, itemIds: d.items.map((i) => i.id) })),
        ),
      () => setColumns(before),
    );
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${findItem(active.id)?.title ?? "item"}.`,
    onDragOver: ({ active, over }) => {
      if (!over) return `${findItem(active.id)?.title ?? "Item"} is no longer over a day.`;
      const d = findDay(columns, over.id);
      if (!d) return undefined;
      const position = d.items.findIndex((i) => i.id === over.id);
      return `${findItem(active.id)?.title ?? "Item"} is over ${dayLabel(d)}${position >= 0 ? `, position ${position + 1} of ${d.items.length}` : ""}.`;
    },
    onDragEnd: ({ active, over }) => {
      const d = over ? findDay(columns, over.id) : null;
      return d
        ? `Dropped ${findItem(active.id)?.title ?? "item"} in ${dayLabel(d)}.`
        : "Move cancelled.";
    },
    onDragCancel: ({ active }) =>
      `Move cancelled. ${findItem(active.id)?.title ?? "Item"} went back to where it was.`,
  };

  const activeItem = activeId ? findItem(activeId) : null;

  return (
    <div className="space-y-6">
      <p data-print="hide" className="text-muted-foreground flex items-start gap-2 text-sm">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Drag items by the handle to reorder them or move them to another day (with a keyboard: Tab
        to a handle, then Space). Times update to fit. Lock an item to keep it when you regenerate
        its day.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setColumns(snapshot.current);
        }}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "To move an item, press Space or Enter to pick it up. Use the up and down arrow keys to move it, including into the next or previous day. Press Space or Enter to drop it, or Escape to cancel.",
          },
        }}
      >
        <ol className="space-y-6">
          {columns.map((day) => (
            <li key={day.id}>
              <DayColumn
                day={day}
                allDays={columns}
                money={money}
                disabled={locked}
                regenerating={live.busyDayNumber === day.dayNumber}
                busyItemId={live.busyItemId}
                onRegenerate={() => setConfirmRegen(day)}
                onSwap={(item) => run("", () => swapItemAction(item.id))}
                onLock={(item) =>
                  run(
                    item.locked ? "Unlocked" : "Locked: it stays when you regenerate the day",
                    () => setItemLockedAction(item.id, !item.locked),
                  )
                }
                onMove={(item, target) =>
                  run(`Moved to ${dayLabel(target)}`, () => moveItemToDayAction(item.id, target.id))
                }
                onRemove={(item) => setConfirmRemove(item)}
              />
            </li>
          ))}
        </ol>
        <DragOverlay>
          {activeItem ? <ItemCard item={activeItem} money={money} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <AlertDialog
        open={confirmRegen !== null}
        onOpenChange={(open) => !open && setConfirmRegen(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Regenerate {confirmRegen ? dayLabel(confirmRegen) : "this day"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              We&apos;ll plan this day again from scratch. Locked items stay; everything else is
              replaced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const day = confirmRegen;
                setConfirmRegen(null);
                if (day) run("", () => regenerateDayAction(tripId, day.dayNumber));
              }}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmRemove !== null}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {confirmRemove?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              It comes off the plan and out of the budget. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const item = confirmRemove;
                setConfirmRemove(null);
                if (!item) return;
                const before = columns;
                setColumns((cols) =>
                  cols.map((d) => ({ ...d, items: d.items.filter((i) => i.id !== item.id) })),
                );
                run(
                  `Removed ${item.title}`,
                  () => removeItemAction(item.id),
                  () => setColumns(before),
                );
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type Money = ReturnType<typeof moneyFormatter>;

function DayColumn({
  day,
  allDays,
  money,
  disabled,
  regenerating,
  busyItemId,
  onRegenerate,
  onSwap,
  onLock,
  onMove,
  onRemove,
}: {
  day: EditorDay;
  allDays: EditorDay[];
  money: Money;
  disabled: boolean;
  regenerating: boolean;
  busyItemId: string | null;
  onRegenerate: () => void;
  onSwap: (item: EditorItem) => void;
  onLock: (item: EditorItem) => void;
  onMove: (item: EditorItem, target: EditorDay) => void;
  onRemove: (item: EditorItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.id });
  const total = day.items.reduce((n, i) => n + money.convert(i.costMinor, i.currency), 0);
  const last = day.items.at(-1);
  const endsAt = last ? (parseHHMM(last.startTime) ?? 0) + (last.durationMin ?? 0) : 0;
  const packed = endsAt > 23 * 60;
  const headingId = `day-${day.dayNumber}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={regenerating || undefined}
      className={cn(
        "bg-card relative rounded-xl border shadow-xs transition-colors",
        isOver && "border-primary/50",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
            Day {day.dayNumber}
            {day.date ? ` · ${formatDay(new Date(day.date), { weekday: "short" })}` : ""}
            {day.city ? ` · ${day.city}` : ""}
          </p>
          <h3 id={headingId} className="mt-1 text-xl font-semibold">
            {day.title}
          </h3>
          {day.summary ? <p className="text-muted-foreground mt-1 text-sm">{day.summary}</p> : null}
        </div>
        <Button variant="outline" size="sm" onClick={onRegenerate} disabled={disabled}>
          <RefreshCwIcon className={cn(regenerating && "animate-spin")} />
          {regenerating ? "Regenerating…" : "Regenerate day"}
        </Button>
      </header>

      <SortableContext items={day.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ol
          ref={setNodeRef}
          className={cn("min-h-16 space-y-2 p-3 sm:p-4", regenerating && "opacity-40")}
        >
          {day.items.length === 0 ? (
            <li className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              Nothing planned. Drag something here, or regenerate the day.
            </li>
          ) : null}
          {day.items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              day={day}
              allDays={allDays}
              money={money}
              disabled={disabled}
              swapping={busyItemId === item.id}
              onSwap={onSwap}
              onLock={onLock}
              onMove={onMove}
              onRemove={onRemove}
            />
          ))}
        </ol>
      </SortableContext>

      {packed ? (
        <p className="bg-estimate text-estimate-foreground mx-3 mb-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm sm:mx-4">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This day runs past 11pm. Consider moving something to another day.
        </p>
      ) : null}
      <footer className="flex justify-between border-t px-5 py-3 text-sm sm:px-6">
        <span className="text-muted-foreground">Day total (estimate)</span>
        <span className="font-semibold tabular-nums">{formatMoney(total, money.currency)}</span>
      </footer>

      {regenerating ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl">
          <p className="bg-card flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm">
            <LoaderCircleIcon className="text-primary size-4 animate-spin" aria-hidden="true" />
            Planning day {day.dayNumber} again…
          </p>
        </div>
      ) : null}
    </section>
  );
}

function SortableItem({
  item,
  day,
  allDays,
  money,
  disabled,
  swapping,
  onSwap,
  onLock,
  onMove,
  onRemove,
}: {
  item: EditorItem;
  day: EditorDay;
  allDays: EditorDay[];
  money: Money;
  disabled: boolean;
  swapping: boolean;
  onSwap: (item: EditorItem) => void;
  onLock: (item: EditorItem) => void;
  onMove: (item: EditorItem, target: EditorDay) => void;
  onRemove: (item: EditorItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled,
  });
  const swappable = item.type === "ACTIVITY" || item.type === "MEAL";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-30")}
    >
      <ItemCard
        item={item}
        money={money}
        swapping={swapping}
        handle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            disabled={disabled}
            className="text-muted-foreground hover:bg-secondary focus-visible:ring-ring/40 flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded focus-visible:ring-[3px] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Move ${item.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon className="size-4" aria-hidden="true" />
          </button>
        }
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={disabled}
                aria-label={`Options for ${item.title}`}
              >
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-muted-foreground truncate text-xs font-normal">
                {item.title}
              </DropdownMenuLabel>
              {swappable ? (
                <DropdownMenuItem onSelect={() => onSwap(item)}>
                  <ShuffleIcon />
                  Swap for something else
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={() => onLock(item)}>
                {item.locked ? <LockOpenIcon /> : <LockIcon />}
                {item.locked ? "Unlock" : "Lock (keep when regenerating)"}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CalendarDaysIcon />
                  Move to another day
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {allDays
                    .filter((d) => d.id !== day.id)
                    .map((d) => (
                      <DropdownMenuItem key={d.id} onSelect={() => onMove(item, d)}>
                        {dayLabel(d)}
                        {d.city ? (
                          <span className="text-muted-foreground ml-auto text-xs">{d.city}</span>
                        ) : null}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onRemove(item)}>
                <Trash2Icon />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
    </li>
  );
}

function ItemCard({
  item,
  money,
  handle,
  menu,
  swapping = false,
  overlay = false,
}: {
  item: EditorItem;
  money: Money;
  handle?: React.ReactNode;
  menu?: React.ReactNode;
  swapping?: boolean;
  overlay?: boolean;
}) {
  const Icon = ITEM_ICON[item.type];
  const price =
    item.costMinor === 0 ? "Free" : money.formatWithOriginal(item.costMinor, item.currency);
  return (
    <div
      className={cn("relative", overlay && "bg-card ring-primary/40 rounded-lg shadow-lg ring-1")}
    >
      {item.travelModeFromPrev ? (
        <p className="text-muted-foreground mb-1 pl-[4.25rem] text-xs">
          ↳ {item.travelModeFromPrev}
        </p>
      ) : null}
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg p-2 sm:gap-3",
          !overlay && "hover:bg-secondary/50",
          swapping && "opacity-40",
        )}
      >
        {handle ?? <span className="w-6" />}
        <span className="bg-sea-wash text-primary flex size-9 shrink-0 items-center justify-center rounded-full border">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
            <span className="tabular-nums">{item.startTime ?? item.slot.toLowerCase()}</span>
            {formatDuration(item.durationMin) ? (
              <span className="flex items-center gap-0.5">
                <ClockIcon className="size-3" aria-hidden="true" />
                {formatDuration(item.durationMin)}
              </span>
            ) : null}
            {item.locked ? (
              <Badge variant="secondary" className="px-1.5 py-0">
                <LockIcon aria-hidden="true" />
                Locked
              </Badge>
            ) : null}
          </p>
          <p className="font-medium">{item.title}</p>
          <p className="text-sm font-semibold tabular-nums sm:hidden">{price}</p>
          {item.description ? (
            <p className="text-muted-foreground mt-0.5 text-sm">{item.description}</p>
          ) : null}
          {item.notes ? (
            <p className="text-terracotta-ink mt-1 flex items-start gap-1 text-xs">
              <InfoIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              {item.notes}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="hidden text-sm font-semibold whitespace-nowrap tabular-nums sm:block">
            {price}
          </p>
          {menu}
        </div>
      </div>
      {swapping ? (
        <p className="absolute inset-0 flex items-center justify-center text-sm font-medium">
          <span className="bg-card flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm">
            <LoaderCircleIcon className="text-primary size-4 animate-spin" aria-hidden="true" />
            Finding an alternative…
          </span>
        </p>
      ) : null}
    </div>
  );
}
