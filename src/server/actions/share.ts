"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { makeShareSlug } from "@/lib/share";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/session";
import { tripCacheTag } from "@/server/share";

export type ShareResult = {
  ok?: true;
  error?: string;
  slug?: string | null;
  isPublic?: boolean;
  showCosts?: boolean;
};

/** Sharing is for saved trips: the signed-in owner only (guest trips expire). */
async function ownTripForSharing(tripId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to share this trip." } as const;
  const trip = await db.trip.findFirst({ where: { id: tripId, userId: user.id } });
  if (!trip) return { error: "That trip couldn't be found." } as const;
  if (trip.status !== "READY") return { error: "You can share the trip once it's ready." } as const;
  return { trip } as const;
}

/** Retry on the (astronomically unlikely) unique-slug collision. */
async function saveNewSlug(tripId: string, title: string, data: Prisma.TripUpdateInput) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.trip.update({
        where: { id: tripId },
        data: { ...data, shareSlug: makeShareSlug(title) },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new Error("Could not create a unique share link");
}

function refreshed(
  tripId: string,
  trip: { shareSlug: string | null; isPublic: boolean; shareShowCosts: boolean },
): ShareResult {
  updateTag(tripCacheTag(tripId));
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  return {
    ok: true,
    slug: trip.shareSlug,
    isPublic: trip.isPublic,
    showCosts: trip.shareShowCosts,
  };
}

const SettingsSchema = z.object({ enabled: z.boolean(), showCosts: z.boolean() });

export async function setSharingAction(tripId: string, raw: unknown): Promise<ShareResult> {
  const parsed = SettingsSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid sharing settings." };
  const owned = await ownTripForSharing(tripId);
  if ("error" in owned) return { error: owned.error };
  const { trip } = owned;
  const { enabled, showCosts } = parsed.data;
  const data: Prisma.TripUpdateInput = {
    isPublic: enabled,
    shareShowCosts: showCosts,
    ...(enabled && !trip.isPublic ? { sharedAt: new Date() } : {}),
  };
  const updated =
    enabled && !trip.shareSlug
      ? await saveNewSlug(trip.id, trip.title, data)
      : await db.trip.update({ where: { id: trip.id }, data });
  return refreshed(trip.id, updated);
}

/** Replace the link: anyone holding the old one loses access. */
export async function resetShareLinkAction(tripId: string): Promise<ShareResult> {
  const owned = await ownTripForSharing(tripId);
  if ("error" in owned) return { error: owned.error };
  const updated = await saveNewSlug(owned.trip.id, owned.trip.title, {});
  return refreshed(owned.trip.id, updated);
}
