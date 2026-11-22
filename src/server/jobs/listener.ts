import "server-only";
import { EventEmitter } from "node:events";
import { Client } from "pg";
import { PROGRESS_CHANNEL } from "@/server/generation/progress";

/**
 * One LISTEN connection per process, fanned out to SSE streams in memory.
 * If the connection drops we reconnect; SSE streams also poll, so nothing is lost meanwhile.
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

let connecting: Promise<void> | null = null;

function connect(): Promise<void> {
  connecting ??= (async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    const reset = () => {
      connecting = null;
      client.removeAllListeners();
      client.end().catch(() => {});
      setTimeout(() => {
        if (emitter.eventNames().length > 0) void connect().catch(() => {});
      }, 2000);
    };
    client.on("notification", (msg) => {
      if (msg.channel === PROGRESS_CHANNEL && msg.payload) emitter.emit(msg.payload);
    });
    client.on("error", (error) => {
      console.error("[listener] connection error", error);
      reset();
    });
    try {
      await client.connect();
      await client.query(`LISTEN ${PROGRESS_CHANNEL}`);
    } catch (error) {
      reset();
      throw error;
    }
  })();
  return connecting;
}

/** Call `onChange` whenever the trip's progress changes. Returns an unsubscribe function. */
export function subscribeToTrip(tripId: string, onChange: () => void): () => void {
  emitter.on(tripId, onChange);
  connect().catch((error) => console.error("[listener] failed to listen", error));
  return () => emitter.off(tripId, onChange);
}
