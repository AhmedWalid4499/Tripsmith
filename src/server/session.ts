import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import type { DisplayCurrency } from "@/lib/money/currencies";

/**
 * Data access layer for the signed-in user. Reading the session touches request cookies,
 * so callers must render inside a <Suspense> boundary (Cache Components requirement).
 */
export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  displayCurrency: DisplayCurrency;
  homeCity: string | null;
  nationality: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Mark this as request-time work before Auth.js runs: it uses crypto randomness internally,
  // which Cache Components otherwise rejects during prerendering.
  await connection();
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      displayCurrency: true,
      homeCity: true,
      nationality: true,
    },
  });
  return user;
}

export async function requireUser(callbackUrl: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}
