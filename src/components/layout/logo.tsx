import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  // A compass rose: four points, the north one in terracotta.
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7", className)}>
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 4 L19 16 L16 14.5 L13 16 Z" fill="var(--terracotta)" />
      <path d="M16 28 L13 16 L16 17.5 L19 16 Z" fill="currentColor" />
      <path d="M4 16 L16 13 L14.5 16 L16 19 Z" fill="currentColor" opacity="0.35" />
      <path d="M28 16 L16 19 L17.5 16 L16 13 Z" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("text-primary flex items-center gap-2 rounded-md", className)}
      aria-label="Tripsmith home"
    >
      <LogoMark />
      <span className="font-display text-foreground text-xl font-semibold tracking-tight">
        Tripsmith
      </span>
    </Link>
  );
}
