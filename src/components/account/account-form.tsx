"use client";

import { useActionState } from "react";
import { CheckIcon } from "lucide-react";
import { updateAccountAction, type AccountFormState } from "@/server/actions/account";
import type { CurrentUser } from "@/server/session";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { CURRENCY_LABELS, DISPLAY_CURRENCIES } from "@/lib/money/currencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}

export function AccountForm({ user }: { user: CurrentUser }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    updateAccountAction,
    {},
  );
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={user.name ?? ""}
          autoComplete="name"
          aria-invalid={e.name ? true : undefined}
          aria-describedby={e.name ? "name-error" : undefined}
        />
        <FieldError id="name-error" message={e.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user.email ?? ""} disabled readOnly />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayCurrency">Show prices in</Label>
          <Select name="displayCurrency" defaultValue={user.displayCurrency}>
            <SelectTrigger id="displayCurrency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISPLAY_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}: {CURRENCY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nationality">Passport nationality</Label>
          <Select name="nationality" defaultValue={user.nationality ?? undefined}>
            <SelectTrigger
              id="nationality"
              className="w-full"
              aria-invalid={e.nationality ? true : undefined}
              aria-describedby={e.nationality ? "nationality-error" : "nationality-hint"}
            >
              <SelectValue placeholder="Choose a country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_OPTIONS.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p id="nationality-hint" className="text-muted-foreground text-xs">
            Used to prefill visa requirements on new trips.
          </p>
          <FieldError id="nationality-error" message={e.nationality} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="homeCity">Usual departure city</Label>
        <Input
          id="homeCity"
          name="homeCity"
          defaultValue={user.homeCity ?? ""}
          placeholder="e.g. Cairo"
          autoComplete="address-level2"
          aria-invalid={e.homeCity ? true : undefined}
          aria-describedby={e.homeCity ? "homeCity-error" : undefined}
        />
        <FieldError id="homeCity-error" message={e.homeCity} />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <p aria-live="polite" className="text-live-foreground flex items-center gap-1 text-sm">
          {state.ok && !pending ? (
            <>
              <CheckIcon className="size-4" aria-hidden="true" /> Saved
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}
