"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setDisplayCurrencyAction } from "@/server/actions/planner";
import { CURRENCY_LABELS, DISPLAY_CURRENCIES, type DisplayCurrency } from "@/lib/money/currencies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CurrencySwitch({ tripId, value }: { tripId: string; value: DisplayCurrency }) {
  const [pending, start] = useTransition();
  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(next) =>
        start(async () => {
          const r = await setDisplayCurrencyAction(tripId, next);
          if (r.error) toast.error(r.error);
        })
      }
    >
      <SelectTrigger size="sm" className="w-[7.5rem]" aria-label="Show prices in">
        <SelectValue>{value}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {DISPLAY_CURRENCIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
            <span className="sr-only"> ({CURRENCY_LABELS[c]})</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
