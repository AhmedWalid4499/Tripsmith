import type { TripStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<
  TripStatus,
  { label: string; variant: "secondary" | "outline" | "destructive" | "live" }
> = {
  DRAFT: { label: "Draft", variant: "outline" },
  QUEUED: { label: "Queued", variant: "secondary" },
  GENERATING: { label: "Planning…", variant: "secondary" },
  READY: { label: "Ready", variant: "live" },
  FAILED: { label: "Needs retry", variant: "destructive" },
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const { label, variant } = LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
