import type { ImportedMatch, ImportedPlayer } from "./model";
import type { Ward } from "../types";

interface ReplayDescriptor {
  name: string;
  size: number;
  modified: number;
}

interface ParseRequest {
  files: ReplayDescriptor[];
  mapVersion: number;
}

function hash(value: string): number {
  let result = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
}

function random(seed: number) {
  let state = seed || 1;

  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);

    return ((state ^ (state >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function mockMatch(file: ReplayDescriptor, mapVersion: number, offset: number): ImportedMatch {
  const fileHash = hash(`${file.name}:${file.size}:${file.modified}`).toString(16).padStart(8, "0");
  const seed = hash(fileHash);
  const next = random(seed);
  const matchId = 8_000_000_000 + seed + offset;
  const radiantWon = next() >= 0.5;
  const duration = 2_100 + Math.floor(next() * 1_500);
  const players: ImportedPlayer[] = Array.from({ length: 10 }, (_, index) => ({
    id: 1_000_000 + ((seed + index * 7_919) % 8_000_000),
    name: index === 0 ? "You (mock)" : `Player ${index + 1}`,
    isRadiant: index < 5,
    hero: `Hero ${1 + Math.floor(next() * 125)}`,
  }));
  const wardCount = 24 + Math.floor(next() * 20);
  const wards: Ward[] = Array.from({ length: wardCount }, (_, index) => {
    const player = players[Math.floor(next() * players.length)]!;
    const destroyed = next() < 0.38;
    const timePlaced = -90 + Math.floor(next() * (duration + 90));
    const lifetime = destroyed ? 20 + Math.floor(next() * 330) : 360;
    const destroyerPool = players.filter((candidate) => candidate.isRadiant !== player.isRadiant);
    const destroyer = destroyed ? destroyerPool[Math.floor(next() * destroyerPool.length)]! : null;
    const observer = next() > 0.28;

    return {
      id: matchId * 100 + index,
      match_id: matchId,
      player_placed_id: player.id,
      player_name: player.name,
      player_destroyed_id: destroyer?.id ?? null,
      player_destroyed_name: destroyer?.name ?? null,
      is_radiant: player.isRadiant,
      is_obs: observer,
      is_destroyed: destroyed,
      time_placed: timePlaced,
      duration: lifetime,
      enemy_hero_vision_seconds: observer ? Math.round(next() * 1000) / 10 : null,
      unique_enemy_hero_vision_seconds: observer ? Math.round(next() * 700) / 10 : null,
      heroes_spotted: observer ? Math.floor(next() * 6) : null,
      hero_reveal_events: observer ? Math.floor(next() * 5) : null,
      unique_hero_reveal_events: observer ? Math.floor(next() * 4) : null,
      x_pos: Math.round(-7_400 + next() * 14_800),
      y_pos: Math.round(-7_400 + next() * 14_800),
      z_pos: Math.floor(next() * 8),
      radiant_networth: null,
      dire_networth: null,
      match_duration: duration,
      team_id: player.isRadiant ? seed * 2 : seed * 2 + 1,
      team_name: player.isRadiant ? "Radiant (mock)" : "Dire (mock)",
      opponent_team_id: player.isRadiant ? seed * 2 + 1 : seed * 2,
      opponent_team_name: player.isRadiant ? "Dire (mock)" : "Radiant (mock)",
      team_won: player.isRadiant === radiantWon,
    };
  });

  return {
    matchId,
    fileName: file.name,
    fileHash,
    mapVersion,
    gameVersion: mapVersion,
    startedAt: file.modified || Date.now(),
    duration,
    importedAt: Date.now(),
    parserVersion: 0,
    radiantWon,
    players,
    wards,
  };
}

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  try {
    self.postMessage({
      matches: event.data.files.map((file, index) => mockMatch(file, event.data.mapVersion, index)),
    });
  } catch (reason) {
    self.postMessage({ error: reason instanceof Error ? reason.message : "Mock parsing failed" });
  }
};
