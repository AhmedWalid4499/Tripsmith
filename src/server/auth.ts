import "server-only";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/server/db";
import { env } from "@/server/env";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

function buildConfig(): NextAuthConfig {
  const e = env();
  if (!e.AUTH_SECRET)
    throw new Error("AUTH_SECRET is not set (at least 16 characters). See .env.example.");
  const providers: NextAuthConfig["providers"] = [
    Resend({
      apiKey: e.AUTH_RESEND_KEY,
      from: e.EMAIL_FROM,
      // Without a Resend key (local dev), print the magic link to the server console instead of emailing it.
      ...(e.AUTH_RESEND_KEY
        ? {}
        : {
            async sendVerificationRequest({ identifier, url }) {
              console.info(`\n[auth] Magic link for ${identifier}:\n${url}\n`);
            },
          }),
    }),
  ];

  if (e.AUTH_GOOGLE_ID && e.AUTH_GOOGLE_SECRET) {
    providers.push(Google({ clientId: e.AUTH_GOOGLE_ID, clientSecret: e.AUTH_GOOGLE_SECRET }));
  }

  return {
    adapter: PrismaAdapter(db),
    secret: e.AUTH_SECRET,
    session: { strategy: "database" },
    trustHost: true,
    providers,
    pages: {
      signIn: "/signin",
      verifyRequest: "/signin/check-email",
      error: "/signin",
    },
    events: {
      // A guest who signs in keeps the trip they planned.
      async signIn({ user }) {
        if (!user.id) return;
        try {
          // Imported lazily: trip-access depends on the session helpers, which depend on this file.
          const { claimGuestTrips } = await import("@/server/trip-access");
          await claimGuestTrips(user.id);
        } catch (error) {
          console.error("[auth] failed to claim guest trips", error);
        }
      },
    },
    callbacks: {
      session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
    },
  };
}

// Lazy config: env is read on first request, not at build time.
export const { handlers, auth, signIn, signOut } = NextAuth(() => buildConfig());

/** Which sign-in methods are configured, for rendering the sign-in page. */
export function authMethods() {
  const e = env();
  return {
    google: Boolean(e.AUTH_GOOGLE_ID && e.AUTH_GOOGLE_SECRET),
    emailDelivers: Boolean(e.AUTH_RESEND_KEY),
  };
}
