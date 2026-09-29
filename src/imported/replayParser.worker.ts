/// <reference lib="webworker" />

import init, { parse_replay } from "../../wasm/pkg/wardmap_wasm";
import { parseWardRecords } from "../api/validation";
import type { ImportedMatch } from "./model";

interface ParseRequest {
  jobId: string;
  file: File;
  mapVersion: number;
}

type ParseResponse =
  | { type: "progress"; jobId: string; message: string }
  | { type: "complete"; jobId: string; match: ImportedMatch }
  | { type: "failed"; jobId: string; error: string };

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  void parse(event.data);
};

async function parse({ jobId, file, mapVersion }: ParseRequest): Promise<void> {
  try {
    self.postMessage({
      type: "progress",
      jobId,
      message: `Reading ${file.name}`,
    } satisfies ParseResponse);

    if (file.size > 512 * 1024 * 1024) {
      throw new Error("Replay exceeds the 512 MB limit");
    }

    await init();
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    const fileHash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    self.postMessage({
      type: "progress",
      jobId,
      message: `Parsing ${file.name}`,
    } satisfies ParseResponse);
    const replay = JSON.parse(parse_replay(new Uint8Array(buffer), mapVersion)) as ImportedMatch;
    const match: ImportedMatch = {
      ...replay,
      wards: parseWardRecords(replay.wards),
      fileName: file.name,
      fileHash,
      mapVersion,
      importedAt: Date.now(),
      parserVersion: 1,
    };

    self.postMessage({ type: "complete", jobId, match } satisfies ParseResponse);
  } catch (reason) {
    self.postMessage({
      type: "failed",
      jobId,
      error: reason instanceof Error ? reason.message : String(reason),
    } satisfies ParseResponse);
  }
}
