import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/server/session";
import { AccountForm } from "@/components/account/account-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold">Account</h1>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>
            <h2>Your details</h2>
          </CardTitle>
          <CardDescription>
            These defaults prefill every new trip. You can change them per trip.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<AccountFormSkeleton />}>
            <AccountSection />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountFormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

async function AccountSection() {
  const user = await requireUser("/account");
  return <AccountForm user={user} />;
}
