import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/session";

export const GUEST_COOKIE = "ts_guest";

export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function readGuestTokenHash(): Promise<string | null> {
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  return token ? hashGuestToken(token) : null;
}

/** Returns the guest token hash, creating the cookie if needed. Server Actions / Route Handlers only. */
export async function ensureGuestTokenHash(): Promise<string> {
  const jar = await cookies();
  let token = jar.get(GUEST_COOKIE)?.value;
  if (!token) {
    token = randomBytes(32).toString("base64url");
    jar.set(GUEST_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return hashGuestToken(token);
}

export type Viewer = { userId: string | null; guestTokenHash: string | null };

export async function getViewer(): Promise<Viewer> {
  const [user, guestTokenHash] = await Promise.all([getCurrentUser(), readGuestTokenHash()]);
  return { userId: user?.id ?? null, guestTokenHash };
}

export function canEditTrip(
  trip: { userId: string | null; guestTokenHash: string | null },
  viewer: Viewer,
) {
  if (trip.userId) return trip.userId === viewer.userId;
  return Boolean(viewer.guestTokenHash && trip.guestTokenHash === viewer.guestTokenHash);
}

/** The trip if the current viewer owns it (account or guest cookie), otherwise null. */
export async function findOwnedTrip(tripId: string) {
  const viewer = await getViewer();
  const trip = await db.trip.findUnique({ where: { id: tripId } });
  if (!trip || !canEditTrip(trip, viewer)) return null;
  if (!trip.userId && trip.expiresAt && trip.expiresAt < new Date()) return null;
  return { trip, viewer };
}

/** Move a guest's trips onto their account after sign-in. Called from the Auth.js signIn event. */
export async function claimGuestTrips(userId: string) {
  const hash = await readGuestTokenHash();
  if (!hash) return 0;
  const { count } = await db.trip.updateMany({
    where: { guestTokenHash: hash, userId: null },
    data: { userId, guestTokenHash: null, expiresAt: null },
  });
  (await cookies()).delete(GUEST_COOKIE);
  return count;
}
