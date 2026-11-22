"use client";

import { useSyncExternalStore } from "react";
import {
  BedDoubleIcon,
  CalendarRangeIcon,
  InfoIcon,
  ListChecksIcon,
  PiggyBankIcon,
  StampIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { id: "itinerary", label: "Itinerary", icon: CalendarRangeIcon },
  { id: "stays", label: "Stays & flights", icon: BedDoubleIcon },
  { id: "visa", label: "Visa", icon: StampIcon },
  { id: "checklist", label: "Checklist", icon: ListChecksIcon },
  { id: "budget", label: "Budget", icon: PiggyBankIcon },
  { id: "info", label: "Info", icon: InfoIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Tabs whose panels are rendered on the server; the selected tab is kept in the URL hash. */
// The selected tab lives in the URL hash, read as an external store (no effects, no hydration mismatch).
const HASH_EVENT = "planner-hash-change";
function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener(HASH_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(HASH_EVENT, onChange);
  };
}
const readHash = () => window.location.hash.slice(1);
const serverHash = () => "";

/** Tabs whose panels are rendered on the server; the selected tab is kept in the URL hash. */
export function PlannerTabs({
  panels,
  badges,
}: {
  panels: Record<TabId, React.ReactNode>;
  badges?: Partial<Record<TabId, string>>;
}) {
  const hash = useSyncExternalStore(subscribe, readHash, serverHash);
  const tab: TabId = TABS.some((t) => t.id === hash) ? (hash as TabId) : "itinerary";

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        window.history.replaceState(null, "", `#${value}`);
        window.dispatchEvent(new Event(HASH_EVENT));
      }}
    >
      <TabsList aria-label="Trip planner sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <TabsTrigger key={id} value={id}>
            <Icon aria-hidden="true" />
            {label}
            {badges?.[id] ? (
              <span className="bg-secondary text-secondary-foreground rounded-full px-1.5 text-xs">
                {badges[id]}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {TABS.map(({ id }) => (
        <TabsContent key={id} value={id} forceMount className="data-[state=inactive]:hidden">
          {panels[id]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
