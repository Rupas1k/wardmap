import type { ImportedMatch } from "./model";

export interface ParserResult {
  matches: ImportedMatch[];
  errors: string[];
}

export default function runReplayParser(
  files: readonly File[],
  mapVersion: number,
  onProgress: (message: string) => void,
  signal: AbortSignal,
): Promise<ParserResult> {
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
    worker.onmessage = (
      event: MessageEvent<Partial<ParserResult> & { progress?: string; error?: string }>,
    ) => {
      if (event.data.progress) {
        onProgress(event.data.progress);

        return;
      }
      cleanup();

      if (event.data.error) {
        reject(new Error(event.data.error));

        return;
      }
      if (!event.data.matches || !event.data.errors) {
        reject(new Error("Replay parser returned an invalid result"));

        return;
      }
      resolve({ matches: event.data.matches, errors: event.data.errors });
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
    worker.postMessage({ files, mapVersion });
  });
}
