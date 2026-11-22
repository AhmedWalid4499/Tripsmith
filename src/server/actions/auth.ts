"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/server/auth";

/** Only allow same-site relative callback URLs, to avoid open redirects. */
function safeCallback(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/trips";
}

export type EmailSignInState = { error?: string };

export async function emailSignInAction(
  _prev: EmailSignInState,
  formData: FormData,
): Promise<EmailSignInState> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  try {
    // redirect: false so we control the navigation; Auth.js would otherwise bounce through
    // its own /api/auth/verify-request route, which the client router can't follow from an action.
    await signIn("resend", {
      email: parsed.data,
      redirectTo: safeCallback(formData.get("callbackUrl")),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError)
      return { error: "We couldn't send the sign-in link. Try again." };
    throw error;
  }
  redirect("/signin/check-email");
}

export async function googleSignInAction(formData: FormData) {
  await signIn("google", { redirectTo: safeCallback(formData.get("callbackUrl")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
