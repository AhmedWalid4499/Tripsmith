import "server-only";
import { runEditJob } from "@/server/generation/edits";
import { runFullPlan } from "@/server/generation/orchestrator";
import { runMaintenance } from "./maintenance";
import { getBoss, QUEUES, type EditJob, type FullPlanJob } from "./queue";

/** Start consuming generation jobs. Used by the worker service, or in-process when RUN_WORKER_IN_WEB=true. */
export async function startWorker() {
  const boss = await getBoss("worker");
  await boss.work<FullPlanJob>(QUEUES.fullPlan, { localConcurrency: 2 }, async (jobs) => {
    for (const job of jobs) {
      await runFullPlan(job.data.jobId);
    }
  });
  await boss.work<EditJob>(QUEUES.edit, { localConcurrency: 4 }, async (jobs) => {
    for (const job of jobs) {
      await runEditJob(job.data.jobId);
    }
  });
  await boss.createQueue(QUEUES.maintenance, { retryLimit: 0, expireInSeconds: 10 * 60 });
  await boss.work(QUEUES.maintenance, async () => {
    await runMaintenance();
  });
  await boss.schedule(QUEUES.maintenance, "17 * * * *"); // hourly, off the top of the hour
  console.info(
    `[worker] listening on "${QUEUES.fullPlan}" and "${QUEUES.edit}"; maintenance runs hourly`,
  );
  return boss;
}
