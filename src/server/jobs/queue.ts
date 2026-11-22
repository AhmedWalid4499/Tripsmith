import "server-only";
import { PgBoss } from "pg-boss";

export const QUEUES = {
  fullPlan: "trip-full-plan",
  /** Short planner edits (regenerate a day, swap an item), kept apart so they don't wait behind full plans. */
  edit: "trip-edit",
} as const;

export type FullPlanJob = { jobId: string };
export type EditJob = { jobId: string };

type Role = "sender" | "worker";
const instances = new Map<Role, Promise<PgBoss>>();

/**
 * One pg-boss instance per role per process. The web app is only a sender (no maintenance or
 * cron); the worker process runs maintenance. Both create the pg-boss schema on first start.
 */
export function getBoss(role: Role = "sender"): Promise<PgBoss> {
  let p = instances.get(role);
  if (!p) {
    p = (async () => {
      const boss = new PgBoss({
        connectionString: process.env.DATABASE_URL,
        schema: "pgboss",
        application_name: `tripsmith-${role}`,
        max: role === "worker" ? 5 : 2,
        supervise: role === "worker",
        schedule: false,
      });
      boss.on("error", (error) => console.error(`[pg-boss:${role}]`, error));
      await boss.start();
      // Jobs record their own failures and never throw, so retries only cover crashes.
      await boss.createQueue(QUEUES.fullPlan, {
        retryLimit: 1,
        retryDelay: 30,
        expireInSeconds: 30 * 60,
      });
      await boss.createQueue(QUEUES.edit, {
        retryLimit: 1,
        retryDelay: 10,
        expireInSeconds: 10 * 60,
      });
      return boss;
    })();
    // Let a failed start be retried on the next call instead of caching the rejection.
    p.catch(() => instances.delete(role));
    instances.set(role, p);
  }
  return p;
}

export async function enqueueFullPlan(jobId: string) {
  const boss = await getBoss("sender");
  await boss.send(QUEUES.fullPlan, { jobId } satisfies FullPlanJob, { singletonKey: jobId });
}

export async function enqueueEdit(jobId: string) {
  const boss = await getBoss("sender");
  await boss.send(QUEUES.edit, { jobId } satisfies EditJob, { singletonKey: jobId });
}
