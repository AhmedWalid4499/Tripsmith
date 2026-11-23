import { Suspense } from "react";
import type { Metadata } from "next";
import { authMethods } from "@/server/auth";
import { googleSignInAction } from "@/server/actions/auth";
import { EmailSignInForm } from "@/components/auth/email-sign-in-form";
import { GoogleIcon } from "@/components/auth/google-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Sign in" };

const ERROR_MESSAGES: Record<string, string> = {
  Verification: "That sign-in link has expired or was already used. Request a new one.",
  OAuthAccountNotLinked:
    "This email is already linked to another sign-in method. Use the method you signed up with.",
  AccessDenied: "Access was denied.",
};

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-20">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            <h1>Sign in to Tripsmith</h1>
          </CardTitle>
          <CardDescription>
            Save your trips, edit them anytime and share them with others.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<SignInOptionsSkeleton />}>
            <SignInOptions searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

function SignInOptionsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

async function SignInOptions({
  searchParams,
}: {
  searchParams: PageProps<"/signin">["searchParams"];
}) {
  const sp = await searchParams;
  const callbackUrl = typeof sp.callbackUrl === "string" ? sp.callbackUrl : "/trips";
  const errorKey = typeof sp.error === "string" ? sp.error : undefined;
  const error = errorKey
    ? (ERROR_MESSAGES[errorKey] ?? "Something went wrong. Please try again.")
    : null;
  const methods = authMethods();

  return (
    <div className="space-y-5">
      {error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-3 text-sm"
        >
          {error}
        </p>
      ) : null}

      {methods.google ? (
        <>
          <form action={googleSignInAction}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <Button type="submit" variant="outline" className="w-full">
              <GoogleIcon className="size-4" />
              Continue with Google
            </Button>
          </form>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" />
            or
            <span className="bg-border h-px flex-1" />
          </div>
        </>
      ) : null}

      <EmailSignInForm callbackUrl={callbackUrl} />

      {!methods.emailDelivers ? (
        <p className="text-muted-foreground text-xs">
          Development mode: the sign-in link is printed in the server console.
        </p>
      ) : null}
    </div>
  );
}
