export async function register() {
  // Optional: run the generation worker inside the web server (local dev, single-service deploys).
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.RUN_WORKER_IN_WEB === "true") {
    const { startWorker } = await import("@/server/jobs/worker");
    await startWorker();
  }
}
