"use server";

import { redirect } from "next/navigation";
import { toMinor } from "@/lib/money/convert";
import { resolveDates, TripInputSchema, type TripInput } from "@/lib/trip-input";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { enqueueFullPlan } from "@/server/jobs/queue";
import { getCurrentUser } from "@/server/session";
import { ensureGuestTokenHash, findOwnedTrip } from "@/server/trip-access";

export type CreateTripResult = {
  error?: string;
  code?: "GUEST_LIMIT" | "INVALID" | "QUEUE";
  fieldErrors?: Record<string, string>;
};

export async function createTripAction(raw: TripInput): Promise<CreateTripResult> {
  const parsed = TripInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { code: "INVALID", error: "Some details need another look.", fieldErrors };
  }
  const input = parsed.data;
  const user = await getCurrentUser();

  let guestTokenHash: string | null = null;
  let expiresAt: Date | null = null;
  if (!user) {
    guestTokenHash = await ensureGuestTokenHash();
    const existing = await db.trip.count({
      where: { guestTokenHash, userId: null, expiresAt: { gt: new Date() } },
    });
    if (existing > 0) {
      return {
        code: "GUEST_LIMIT",
        error:
          "Guests can plan one trip. Sign in to plan more; your first trip will be saved to your account.",
      };
    }
    expiresAt = new Date(Date.now() + env().GUEST_TRIP_TTL_DAYS * 86_400_000);
  }

  const { startDate, endDate, lengthDays } = resolveDates(input);
  const trip = await db.trip.create({
    data: {
      userId: user?.id ?? null,
      guestTokenHash,
      expiresAt,
      title: input.surpriseMe ? "Surprise trip" : input.destination,
      destinationQuery: input.surpriseMe ? "" : input.destination,
      surpriseMe: input.surpriseMe,
      departureCity: input.departureCity,
      startDate,
      endDate,
      lengthDays,
      travellers: input.travellers,
      budgetMinor: toMinor(input.budgetAmount, input.budgetCurrency),
      budgetCurrency: input.budgetCurrency,
      displayCurrency: user?.displayCurrency ?? input.budgetCurrency,
      style: input.style,
      interests: input.interests,
      nationality: input.nationality,
      status: "QUEUED",
      jobs: { create: { kind: "FULL_PLAN", message: "Waiting for a planner…" } },
    },
    include: { jobs: true },
  });

  try {
    await enqueueFullPlan(trip.jobs[0]!.id);
  } catch (error) {
    console.error("[trips] failed to enqueue generation", error);
    await db.trip.update({ where: { id: trip.id }, data: { status: "FAILED" } });
    await db.generationJob.update({
      where: { id: trip.jobs[0]!.id },
      data: { status: "FAILED", error: "We couldn't start planning. Please try again." },
    });
  }
  redirect(`/trips/${trip.id}`);
}

/** Start a fresh generation for a trip whose last attempt failed. */
export async function retryGenerationAction(tripId: string): Promise<{ error?: string }> {
  const owned = await findOwnedTrip(tripId);
  if (!owned) return { error: "Trip not found." };
  const running = await db.generationJob.count({
    where: { tripId, status: { in: ["QUEUED", "RUNNING"] } },
  });
  if (running > 0) return {};
  const job = await db.generationJob.create({
    data: { tripId, kind: "FULL_PLAN", message: "Waiting for a planner…" },
  });
  await db.trip.update({ where: { id: tripId }, data: { status: "QUEUED" } });
  await enqueueFullPlan(job.id);
  redirect(`/trips/${tripId}`);
}
