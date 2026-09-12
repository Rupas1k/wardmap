import type { ImportedMatch } from "./model";

interface ParserResponse {
  matches?: ImportedMatch[];
  error?: string;
}

export default function runReplayParser(
  files: readonly File[],
  mapVersion: number,
): Promise<ImportedMatch[]> {
  const worker = new Worker(new URL("./mockParser.worker.ts", import.meta.url), { type: "module" });

  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<ParserResponse>) => {
      worker.terminate();

      if (event.data.error) {
        reject(new Error(event.data.error));

        return;
      }

      resolve(event.data.matches ?? []);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "Replay parser worker failed"));
    };
    worker.postMessage({
      files: files.map((file) => ({
        name: file.name,
        size: file.size,
        modified: file.lastModified,
      })),
      mapVersion,
    });
  });
}
