"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react";
import { createTripAction } from "@/server/actions/trips";
import { callAction } from "@/lib/call-action";
import { COUNTRY_OPTIONS, countryName } from "@/lib/countries";
import { CURRENCY_LABELS, DISPLAY_CURRENCIES, type DisplayCurrency } from "@/lib/money/currencies";
import {
  INTERESTS,
  MAX_TRAVELLERS,
  MAX_TRIP_DAYS,
  TRAVEL_STYLES,
  TRIP_FORM_STEPS,
  inclusiveDays,
  todayIso,
  type TripInput,
} from "@/lib/trip-input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TripFormDefaults = {
  departureCity: string;
  nationality: string;
  budgetCurrency: DisplayCurrency;
};

type Values = Omit<TripInput, "travellers" | "budgetAmount" | "lengthDays"> & {
  travellers: number;
  lengthDays: number;
  budgetAmount: string;
};

type Errors = Partial<Record<keyof Values, string>>;

function FieldError({ name, errors }: { name: keyof Values; errors: Errors }) {
  const message = errors[name];
  if (!message) return null;
  return (
    <p id={`${name}-error`} role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}

function errorProps(name: keyof Values, errors: Errors, hint?: string) {
  const invalid = Boolean(errors[name]);
  return {
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? `${name}-error` : hint,
  };
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="Progress">
      {TRIP_FORM_STEPS.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li
            key={step.id}
            className="flex flex-1 flex-col gap-2"
            aria-current={state === "current" ? "step" : undefined}
          >
            <span
              className={cn(
                "h-1.5 rounded-full",
                state === "todo"
                  ? "bg-border"
                  : state === "current"
                    ? "bg-primary"
                    : "bg-primary/50",
              )}
            />
            <span
              className={cn(
                "hidden text-xs sm:block",
                state === "current" ? "text-foreground font-semibold" : "text-muted-foreground",
              )}
            >
              {step.title}
              {state === "done" ? <span className="sr-only"> (completed)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function TripForm({ defaults, isGuest }: { defaults: TripFormDefaults; isGuest: boolean }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({
    surpriseMe: false,
    destination: "",
    departureCity: defaults.departureCity,
    dateMode: "dates",
    startDate: "",
    endDate: "",
    lengthDays: 7,
    travellers: 2,
    budgetAmount: "",
    budgetCurrency: defaults.budgetCurrency,
    style: "MID",
    interests: [],
    nationality: defaults.nationality,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<{ message: string; guestLimit: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validateStep = (i: number): boolean => {
    const result = TRIP_FORM_STEPS[i]!.schema.safeParse(values);
    if (result.success) return true;
    const next: Errors = {};
    for (const issue of result.error.issues) next[issue.path[0] as keyof Values] ??= issue.message;
    setErrors(next);
    // Move focus to the first invalid field so keyboard and screen-reader users land on it.
    requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(),
    );
    return false;
  };

  const goTo = (i: number) => {
    setStep(i);
    setFormError(null);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateStep(step)) return;
    if (step < TRIP_FORM_STEPS.length - 1) return goTo(step + 1);

    startTransition(async () => {
      const result = await callAction(() =>
        createTripAction({
          ...values,
          budgetAmount: Number(values.budgetAmount),
        }),
      );
      // On success the action redirects, so we only get here on an error.
      if (result?.error) {
        setFormError({ message: result.error, guestLimit: result.code === "GUEST_LIMIT" });
        if (result.fieldErrors) setErrors(result.fieldErrors as Errors);
      }
    });
  };

  const tripDays =
    values.dateMode === "dates" && values.startDate && values.endDate
      ? inclusiveDays(values.startDate, values.endDate)
      : null;
  const current = TRIP_FORM_STEPS[step]!;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6">
      <Stepper current={step} />
      <Card>
        <CardContent className="space-y-6">
          <div>
            <p className="text-muted-foreground text-sm">
              Step {step + 1} of {TRIP_FORM_STEPS.length}
            </p>
            <h2 ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-semibold outline-none">
              {
                {
                  where: "Where are you going?",
                  when: "When are you travelling?",
                  who: "Who's coming, and what's the budget?",
                  interests: "What do you love doing?",
                  passport: "Which passport will you travel on?",
                }[current.id]
              }
            </h2>
          </div>

          {current.id === "where" ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={values.destination}
                  onChange={(e) => set("destination", e.target.value)}
                  placeholder="e.g. Japan, or Tokyo and Kyoto"
                  disabled={values.surpriseMe}
                  autoComplete="off"
                  {...errorProps("destination", errors, "destination-hint")}
                />
                <p id="destination-hint" className="text-muted-foreground text-xs">
                  A country, or the cities you want to visit in order.
                </p>
                <FieldError name="destination" errors={errors} />
              </div>
              <button
                type="button"
                aria-pressed={values.surpriseMe}
                onClick={() => set("surpriseMe", !values.surpriseMe)}
                className={cn(
                  "focus-visible:ring-ring/40 flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:ring-[3px]",
                  values.surpriseMe ? "border-primary bg-sea-wash" : "bg-card hover:bg-secondary",
                )}
              >
                <SparklesIcon className="text-terracotta-ink size-5 shrink-0" aria-hidden="true" />
                <span className="flex-1">
                  <span className="block font-medium">Surprise me</span>
                  <span className="text-muted-foreground block text-sm">
                    We&apos;ll pick a destination that fits your interests, budget and passport.
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-5 items-center justify-center rounded border",
                    values.surpriseMe
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {values.surpriseMe ? <CheckIcon className="size-3.5" /> : null}
                </span>
              </button>
              <div className="space-y-2">
                <Label htmlFor="departureCity">Leaving from</Label>
                <Input
                  id="departureCity"
                  value={values.departureCity}
                  onChange={(e) => set("departureCity", e.target.value)}
                  placeholder="e.g. Cairo"
                  autoComplete="address-level2"
                  {...errorProps("departureCity", errors)}
                />
                <FieldError name="departureCity" errors={errors} />
              </div>
            </div>
          ) : null}

          {current.id === "when" ? (
            <div className="space-y-5">
              <div
                role="group"
                aria-label="Dates or trip length"
                className="bg-secondary grid grid-cols-2 gap-2 rounded-lg p-1"
              >
                {(
                  [
                    ["dates", "I know my dates"],
                    ["length", "Just the length"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={values.dateMode === mode}
                    onClick={() => set("dateMode", mode)}
                    className={cn(
                      "focus-visible:ring-ring/40 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-[3px]",
                      values.dateMode === mode
                        ? "bg-card shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {values.dateMode === "dates" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      min={todayIso()}
                      value={values.startDate}
                      onChange={(e) => set("startDate", e.target.value)}
                      {...errorProps("startDate", errors)}
                    />
                    <FieldError name="startDate" errors={errors} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      min={values.startDate || todayIso()}
                      value={values.endDate}
                      onChange={(e) => set("endDate", e.target.value)}
                      {...errorProps("endDate", errors)}
                    />
                    <FieldError name="endDate" errors={errors} />
                  </div>
                  {tripDays && tripDays > 0 ? (
                    <p className="text-muted-foreground text-sm sm:col-span-2">
                      {tripDays} {tripDays === 1 ? "day" : "days"}, {Math.max(tripDays - 1, 0)}{" "}
                      nights.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="lengthDays">Number of days</Label>
                  <Input
                    id="lengthDays"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_TRIP_DAYS}
                    className="max-w-32"
                    value={values.lengthDays}
                    onChange={(e) => set("lengthDays", Number(e.target.value))}
                    {...errorProps("lengthDays", errors, "lengthDays-hint")}
                  />
                  <p id="lengthDays-hint" className="text-muted-foreground text-xs">
                    Without dates we can&apos;t show the weather or checklist deadlines. You can add
                    dates later.
                  </p>
                  <FieldError name="lengthDays" errors={errors} />
                </div>
              )}
            </div>
          ) : null}

          {current.id === "who" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label id="travellers-label">Travellers</Label>
                <div
                  className="flex items-center gap-3"
                  role="group"
                  aria-labelledby="travellers-label"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Fewer travellers"
                    disabled={values.travellers <= 1}
                    onClick={() => set("travellers", values.travellers - 1)}
                  >
                    <MinusIcon />
                  </Button>
                  <output
                    aria-live="polite"
                    className="w-10 text-center text-lg font-semibold tabular-nums"
                  >
                    {values.travellers}
                  </output>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="More travellers"
                    disabled={values.travellers >= MAX_TRAVELLERS}
                    onClick={() => set("travellers", values.travellers + 1)}
                  >
                    <PlusIcon />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetAmount">Total budget for the trip</Label>
                <div className="flex gap-2">
                  <Input
                    id="budgetAmount"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    placeholder="e.g. 3000"
                    className="flex-1"
                    value={values.budgetAmount}
                    onChange={(e) => set("budgetAmount", e.target.value)}
                    {...errorProps("budgetAmount", errors, "budget-hint")}
                  />
                  <Select
                    value={values.budgetCurrency}
                    onValueChange={(v) => set("budgetCurrency", v as DisplayCurrency)}
                  >
                    <SelectTrigger className="w-28" aria-label="Budget currency">
                      <SelectValue>{values.budgetCurrency}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DISPLAY_CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                          <span className="sr-only"> ({CURRENCY_LABELS[c]})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p id="budget-hint" className="text-muted-foreground text-xs">
                  For everyone, including flights and hotels.
                </p>
                <FieldError name="budgetAmount" errors={errors} />
              </div>

              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">Travel style</legend>
                <div role="group" aria-label="Travel style" className="grid gap-2 sm:grid-cols-3">
                  {TRAVEL_STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={values.style === s.id}
                      onClick={() => set("style", s.id)}
                      className={cn(
                        "focus-visible:ring-ring/40 rounded-lg border p-3 text-left transition-colors focus-visible:ring-[3px]",
                        values.style === s.id
                          ? "border-primary bg-sea-wash"
                          : "bg-card hover:bg-secondary",
                      )}
                    >
                      <span className="block font-medium">{s.label}</span>
                      <span className="text-muted-foreground mt-0.5 block text-xs">{s.hint}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          {current.id === "interests" ? (
            <fieldset className="space-y-3">
              <legend className="text-muted-foreground text-sm">
                Pick up to six. We&apos;ll weight the plan towards them.
              </legend>
              <div
                className="flex flex-wrap gap-2"
                id="interests"
                tabIndex={-1}
                {...errorProps("interests", errors)}
              >
                {INTERESTS.map((interest) => {
                  const on = values.interests.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        set(
                          "interests",
                          on
                            ? values.interests.filter((i) => i !== interest.id)
                            : [...values.interests, interest.id],
                        )
                      }
                      className={cn(
                        "focus-visible:ring-ring/40 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-[3px]",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-card hover:bg-secondary",
                      )}
                    >
                      {on ? <CheckIcon className="size-4" aria-hidden="true" /> : null}
                      {interest.label}
                    </button>
                  );
                })}
              </div>
              <FieldError name="interests" errors={errors} />
            </fieldset>
          ) : null}

          {current.id === "passport" ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nationality">Passport nationality</Label>
                <Select
                  value={values.nationality || undefined}
                  onValueChange={(v) => set("nationality", v)}
                >
                  <SelectTrigger
                    id="nationality"
                    className="w-full"
                    {...errorProps("nationality", errors, "nationality-hint")}
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
                  Used only to look up visa requirements.
                </p>
                <FieldError name="nationality" errors={errors} />
              </div>

              <div className="bg-secondary/50 rounded-lg border p-4 text-sm">
                <p className="font-medium">Your trip</p>
                <dl className="text-muted-foreground mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <dt>Where</dt>
                  <dd className="text-foreground">
                    {values.surpriseMe ? "Surprise me" : values.destination}
                  </dd>
                  <dt>From</dt>
                  <dd className="text-foreground">{values.departureCity}</dd>
                  <dt>When</dt>
                  <dd className="text-foreground">
                    {values.dateMode === "dates"
                      ? `${values.startDate} to ${values.endDate}`
                      : `${values.lengthDays} days, flexible`}
                  </dd>
                  <dt>Who</dt>
                  <dd className="text-foreground">
                    {values.travellers} {values.travellers === 1 ? "traveller" : "travellers"},{" "}
                    {TRAVEL_STYLES.find((s) => s.id === values.style)?.label.toLowerCase()}
                  </dd>
                  <dt>Budget</dt>
                  <dd className="text-foreground">
                    {Number(values.budgetAmount).toLocaleString("en")} {values.budgetCurrency}
                  </dd>
                  <dt>Passport</dt>
                  <dd className="text-foreground">
                    {values.nationality ? countryName(values.nationality) : "Not chosen"}
                  </dd>
                </dl>
              </div>
            </div>
          ) : null}

          {formError ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-3 text-sm"
            >
              <p>{formError.message}</p>
              {formError.guestLimit ? (
                <Button asChild size="sm" className="mt-3">
                  <Link href="/signin?callbackUrl=%2Fplan%2Fnew">Sign in to continue</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => goTo(step - 1)} disabled={pending}>
            <ArrowLeftIcon />
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {step < TRIP_FORM_STEPS.length - 1 ? (
            <>
              Next
              <ArrowRightIcon />
            </>
          ) : pending ? (
            "Starting your plan…"
          ) : (
            <>
              <SparklesIcon />
              Plan my trip
            </>
          )}
        </Button>
      </div>

      {isGuest ? (
        <p className="text-muted-foreground text-center text-sm">
          Planning as a guest.{" "}
          <Link
            href="/signin?callbackUrl=%2Fplan%2Fnew"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Sign in
          </Link>{" "}
          to save your trips.
        </p>
      ) : null}
    </form>
  );
}
