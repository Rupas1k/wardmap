import type { ImportedMatch } from "./model";

interface ParserMessage {
  type: "progress" | "complete" | "failed";
  jobId: string;
  message?: string;
  match?: ImportedMatch;
  error?: string;
}

export default function runReplayParser(
  file: File,
  mapVersion: number,
  jobId: string,
  onProgress: (message: string) => void,
  signal: AbortSignal,
): Promise<ImportedMatch> {
  const worker = new Worker(new URL("./replayParser.worker.ts", import.meta.url), {
    type: "module",
  });

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.terminate();
      signal.removeEventListener("abort", abort);
    };

    const abort = () => {
      cleanup();
      reject(new DOMException("Replay import cancelled", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });

    if (signal.aborted) {
      abort();

      return;
    }

    worker.onmessage = (event: MessageEvent<ParserMessage>) => {
      const message = event.data;

      if (message.jobId !== jobId) {
        return;
      }
      if (message.type === "progress" && message.message) {
        onProgress(message.message);

        return;
      }

      cleanup();

      if (message.type === "failed") {
        reject(new Error(message.error ?? "Replay parser failed"));

        return;
      }
      if (message.type !== "complete" || !message.match) {
        reject(new Error("Replay parser returned an invalid result"));

        return;
      }

      resolve(message.match);
    };
    worker.onerror = (event) => {
      cleanup();
      reject(
        new Error(
          event.message || "Replay parser failed. The replay may be unsupported or too large.",
        ),
      );
    };
    worker.onmessageerror = () => {
      cleanup();
      reject(new Error("Unable to read replay parser results"));
    };
    worker.postMessage({ jobId, file, mapVersion });
  });
}
