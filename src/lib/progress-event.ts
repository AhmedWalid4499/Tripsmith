/** Payload of /api/trips/[id]/events (Server-Sent Events). Shared by the route and the client. */
export type ProgressEvent = {
  tripStatus: "DRAFT" | "QUEUED" | "GENERATING" | "READY" | "FAILED";
  job: {
    id: string;
    kind: "FULL_PLAN" | "REGENERATE_DAY" | "SWAP_ACTIVITY";
    status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
    params: { dayNumber?: number; itemId?: string } | null;
    step: string | null;
    progress: number;
    message: string | null;
    error: string | null;
  } | null;
};

export function isJobActive(event: Pick<ProgressEvent, "job">): boolean {
  return event.job?.status === "QUEUED" || event.job?.status === "RUNNING";
}
