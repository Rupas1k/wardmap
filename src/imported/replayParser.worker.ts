/// <reference lib="webworker" />

import init, { parse_replay } from "../../wasm/pkg/wardmap_wasm";
import { parseWardRecords } from "../api/validation";
import type { ImportedMatch } from "./model";

self.onmessage = (event: MessageEvent<{ files: File[]; mapVersion: number }>) => {
  void parse(event.data.files, event.data.mapVersion);
};

async function parse(files: File[], mapVersion: number) {
  const matches: ImportedMatch[] = [];
  const errors: string[] = [];

  try {
    await init();
    for (const [index, file] of files.entries()) {
      self.postMessage({ progress: `Parsing ${index + 1}/${files.length}: ${file.name}` });
      try {
        if (file.size > 512 * 1024 * 1024) {
          throw new Error("Replay exceeds the 512 MB limit");
        }

        const buffer = await file.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", buffer);
        const fileHash = Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
        const replay = JSON.parse(
          parse_replay(new Uint8Array(buffer), mapVersion),
        ) as ImportedMatch;
        matches.push({
          ...replay,
          wards: parseWardRecords(replay.wards),
          fileName: file.name,
          fileHash,
          mapVersion,
          gameVersion: null,
          importedAt: Date.now(),
          parserVersion: 1,
        });
      } catch (reason) {
        errors.push(`${file.name}: ${reason instanceof Error ? reason.message : String(reason)}`);
      }
    }
    self.postMessage({ matches, errors });
  } catch (reason) {
    self.postMessage({ error: reason instanceof Error ? reason.message : "Replay parser failed" });
  }
}
