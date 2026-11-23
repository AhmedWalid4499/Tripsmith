"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  Link2Icon,
  RefreshCwIcon,
  Share2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { resetShareLinkAction, setSharingAction, type ShareResult } from "@/server/actions/share";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type ShareState = { isPublic: boolean; slug: string | null; showCosts: boolean };

export function ShareDialog({
  tripId,
  isGuest,
  initial,
}: {
  tripId: string;
  isGuest: boolean;
  initial: ShareState;
}) {
  const [state, setState] = useState(initial);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const ids = { enabled: useId(), costs: useId(), link: useId() };
  const url =
    state.slug && typeof window !== "undefined" ? `${window.location.origin}/t/${state.slug}` : "";

  const apply = (action: () => Promise<ShareResult>, success?: string) =>
    start(async () => {
      const r = await action();
      if (r.error) return void toast.error(r.error);
      setState({
        isPublic: r.isPublic ?? false,
        slug: r.slug ?? null,
        showCosts: r.showCosts ?? false,
      });
      if (success) toast.success(success);
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={state.isPublic ? "secondary" : "outline"} size="sm">
          {state.isPublic ? <Link2Icon /> : <Share2Icon />}
          {state.isPublic ? "Shared" : "Share"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this trip</DialogTitle>
          <DialogDescription>
            Send a read-only link to the people you&apos;re travelling with. It works on phones and
            prints nicely.
          </DialogDescription>
        </DialogHeader>

        {isGuest ? (
          <div className="bg-secondary/50 space-y-3 rounded-lg border p-4 text-sm">
            <p>
              Sign in to share. Guest trips are deleted after 7 days, so links to them would stop
              working.
            </p>
            <Button asChild size="sm">
              <Link href={`/signin?callbackUrl=${encodeURIComponent(`/trips/${tripId}`)}`}>
                Sign in to share
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor={ids.enabled}>Anyone with the link can view</Label>
                <p className="text-muted-foreground mt-1 text-sm">
                  Turn off at any time; the link stops working straight away.
                </p>
              </div>
              <Switch
                id={ids.enabled}
                checked={state.isPublic}
                disabled={pending}
                onCheckedChange={(enabled) =>
                  apply(
                    () => setSharingAction(tripId, { enabled, showCosts: state.showCosts }),
                    enabled ? "Sharing is on." : "Sharing is off.",
                  )
                }
              />
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id={ids.costs}
                checked={state.showCosts}
                disabled={pending || !state.isPublic}
                onCheckedChange={(v) =>
                  apply(() =>
                    setSharingAction(tripId, { enabled: state.isPublic, showCosts: v === true }),
                  )
                }
                className="mt-0.5"
              />
              <div>
                <Label htmlFor={ids.costs}>Show prices and the budget</Label>
                <p className="text-muted-foreground mt-1 text-sm">
                  Off by default. Your passport country, visa details and checklist are never
                  shared.
                </p>
              </div>
            </div>

            {state.isPublic && url ? (
              <div className="space-y-2">
                <Label htmlFor={ids.link}>Link</Label>
                <div className="flex gap-2">
                  <Input
                    id={ids.link}
                    value={url}
                    readOnly
                    onFocus={(e) => e.currentTarget.select()}
                    className="font-mono text-xs"
                  />
                  <Button type="button" variant="outline" onClick={copy} aria-label="Copy link">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                  </Button>
                </div>
                <p aria-live="polite" className="sr-only">
                  {copied ? "Link copied" : ""}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button asChild variant="ghost" size="sm">
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <ExternalLinkIcon />
                      Open shared view
                    </a>
                  </Button>
                  {confirmReset ? (
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      The current link will stop working.
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => {
                          setConfirmReset(false);
                          apply(
                            () => resetShareLinkAction(tripId),
                            "New link created. The old one no longer works.",
                          );
                        }}
                      >
                        Replace link
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                        Cancel
                      </Button>
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmReset(true)}
                      disabled={pending}
                    >
                      <RefreshCwIcon />
                      Create a new link
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
