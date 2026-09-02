import type { League, Player, Team, Ward } from "../types";

type JsonRecord = Record<string, unknown>;

function record(value: unknown, context: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${context} response`);
  }

  return value as JsonRecord;
}

function array(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${context} response`);
  }

  return value;
}

function number(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid API field: ${field}`);
  }

  return value;
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid API field: ${field}`);
  }

  return value;
}

function nullableNumber(value: unknown, field: string): number | null {
  return value === null ? null : number(value, field);
}

function nullableString(value: unknown, field: string): string | null {
  if (value !== null && typeof value !== "string") {
    throw new Error(`Invalid API field: ${field}`);
  }

  return value;
}

function nullableBoolean(value: unknown, field: string): boolean | null {
  return value === null ? null : boolean(value, field);
}

function dataArray(payload: unknown, context: string): unknown[] {
  return array(record(payload, context).data, context);
}

function fields(value: unknown, context: string) {
  const data = record(value, context);
  const field = (name: string) => `${context}.${name}`;

  return {
    raw: (name: string) => data[name],
    number: (name: string) => number(data[name], field(name)),
    boolean: (name: string) => boolean(data[name], field(name)),
    nullableNumber: (name: string) => nullableNumber(data[name], field(name)),
    nullableString: (name: string) => nullableString(data[name], field(name)),
    nullableBoolean: (name: string) => nullableBoolean(data[name], field(name)),
    optionalNullableNumber: (name: string) =>
      data[name] === undefined ? null : nullableNumber(data[name], field(name)),
    optionalNullableString: (name: string) =>
      data[name] === undefined ? null : nullableString(data[name], field(name)),
  };
}

export function parseLeagues(payload: unknown): League[] {
  return dataArray(payload, "leagues").map((value) => {
    const league = fields(value, "league");
    const name = league.raw("name");

    return {
      id: league.number("id"),
      name: typeof name === "string" ? name : `League ${String(league.raw("id"))}`,
      version: league.number("version"),
      parsed_matches: league.number("parsed_matches"),
      latest_parsed_match_id: league.nullableNumber("latest_parsed_match_id"),
    };
  });
}

export function parsePlayers(payload: unknown): Player[] {
  return dataArray(payload, "players").map((value) => {
    const player = fields(value, "player");
    const wardCount = player.raw("ward_count");

    return {
      id: player.number("id"),
      name: player.nullableString("name"),
      ...(wardCount === undefined ? {} : { ward_count: player.number("ward_count") }),
    };
  });
}

export function parseTeams(payload: unknown): Team[] {
  return dataArray(payload, "teams").map((value) => {
    const team = fields(value, "team");

    return {
      id: team.number("id"),
      name: team.nullableString("name"),
      tag: team.nullableString("tag"),
      logo_url: team.nullableString("logo_url"),
    };
  });
}

export function parseWard(value: unknown): Ward {
  const ward = fields(value, "ward");

  return {
    id: ward.number("id"),
    match_id: ward.number("match_id"),
    player_placed_id: ward.nullableNumber("player_placed_id"),
    player_name: ward.nullableString("player_name"),
    player_destroyed_id: ward.optionalNullableNumber("player_destroyed_id"),
    player_destroyed_name: ward.optionalNullableString("player_destroyed_name"),
    is_radiant: ward.nullableBoolean("is_radiant"),
    is_obs: ward.boolean("is_obs"),
    is_destroyed: ward.boolean("is_destroyed"),
    time_placed: ward.number("time_placed"),
    duration: ward.number("duration"),
    enemy_hero_vision_seconds: ward.optionalNullableNumber("enemy_hero_vision_seconds"),
    unique_enemy_hero_vision_seconds: ward.optionalNullableNumber(
      "unique_enemy_hero_vision_seconds",
    ),
    heroes_spotted: ward.optionalNullableNumber("heroes_spotted"),
    hero_reveal_events: ward.optionalNullableNumber("hero_reveal_events"),
    unique_hero_reveal_events: ward.optionalNullableNumber("unique_hero_reveal_events"),
    x_pos: ward.number("x_pos"),
    y_pos: ward.number("y_pos"),
    z_pos: ward.number("z_pos"),
    radiant_networth: ward.nullableNumber("radiant_networth"),
    dire_networth: ward.nullableNumber("dire_networth"),
    match_duration: ward.nullableNumber("match_duration"),
    team_id: ward.nullableNumber("team_id"),
    team_name: ward.nullableString("team_name"),
    opponent_team_id: ward.nullableNumber("opponent_team_id"),
    opponent_team_name: ward.nullableString("opponent_team_name"),
    team_won: ward.nullableBoolean("team_won"),
  };
}

export function parseWardRecords(value: unknown): Ward[] {
  return array(value, "stored wards").map(parseWard);
}

export interface ParsedWardPage {
  data: Ward[];
  pagination: { has_more: boolean; next_cursor: number | null };
}

export function parseWardCount(payload: unknown): number {
  return fields(payload, "ward count").number("count");
}

export function parseWardPage(payload: unknown): ParsedWardPage {
  const root = record(payload, "ward page");
  const pagination = fields(root.pagination, "pagination");

  return {
    data: array(root.data, "wards").map(parseWard),
    pagination: {
      has_more: pagination.boolean("has_more"),
      next_cursor: pagination.nullableNumber("next_cursor"),
    },
  };
}
