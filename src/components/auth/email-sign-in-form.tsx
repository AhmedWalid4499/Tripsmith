"use client";

import { useActionState } from "react";
import { MailIcon } from "lucide-react";
import { emailSignInAction, type EmailSignInState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState<EmailSignInState, FormData>(
    emailSignInAction,
    {},
  );

  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "email-error" : undefined}
        />
        {state.error ? (
          <p id="email-error" role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        <MailIcon />
        {pending ? "Sending link…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
