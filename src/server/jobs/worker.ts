import "server-only";
import { runFullPlan } from "@/server/generation/orchestrator";
import { getBoss, QUEUES, type FullPlanJob } from "./queue";

/** Start consuming generation jobs. Used by the worker service, or in-process when RUN_WORKER_IN_WEB=true. */
export async function startWorker() {
  const boss = await getBoss("worker");
  await boss.work<FullPlanJob>(QUEUES.fullPlan, { localConcurrency: 2 }, async (jobs) => {
    for (const job of jobs) {
      await runFullPlan(job.data.jobId);
    }
  });
  console.info(`[worker] listening on "${QUEUES.fullPlan}"`);
  return boss;
}
