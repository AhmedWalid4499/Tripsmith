import type { Metadata } from "next";
import Link from "next/link";
import { MailCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="bg-sea-wash text-primary flex size-14 items-center justify-center rounded-full">
        <MailCheckIcon className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-3xl font-semibold">Check your email</h1>
      <p className="text-muted-foreground mt-3">
        We sent you a sign-in link. It works once and expires in 24 hours. You can close this tab.
      </p>
      <Button asChild variant="link" className="mt-6">
        <Link href="/signin">Use a different email</Link>
      </Button>
    </div>
  );
}
