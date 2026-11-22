/**
 * Generation worker entrypoint (Railway "worker" service).
 * Run with: pnpm worker  (node --conditions=react-server --import tsx src/worker/index.ts)
 * The react-server condition lets server-only modules load outside Next.js.
 */
import "dotenv/config";
import { startWorker } from "@/server/jobs/worker";

const boss = await startWorker();

async function shutdown(signal: string) {
  console.info(`[worker] ${signal} received, finishing active jobs…`);
  await boss.stop({ graceful: true, timeout: 60_000 });
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
