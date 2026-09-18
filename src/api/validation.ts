import type {
  League,
  Player,
  Team,
  Ward,
  WardEvidence,
  WardMeasurement,
  WardPopulation,
  WardSighting,
} from "../types";

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

function optionalNullableBoolean(value: unknown, field: string): boolean | null {
  return value === undefined ? null : nullableBoolean(value, field);
}

function parseSighting(value: unknown): WardSighting {
  const event = fields(value, "sighting");
  const legacySteamId = event.raw("target_player");
  const steamId = event.raw("target_steam_id") ?? legacySteamId ?? null;
  const playerName = event.raw("target_player_name") ?? null;
  const heroName = event.raw("target_hero_name") ?? null;
  const parsePosition = (value: unknown, context: string) => {
    if (value == null) {
      return null;
    }

    const position = array(value, context).map((coordinate) =>
      number(coordinate, `${context} coordinate`),
    );

    if (position.length !== 3) {
      throw new Error(`Invalid ${context}`);
    }

    return position as [number, number, number];
  };

  const parseRoute = (value: unknown) =>
    array(value, "sighting route").map((value) => {
      const point = fields(value, "sighting route point");
      const position = parsePosition(point.raw("position"), "route position");

      if (position === null) {
        throw new Error("Invalid sighting route position");
      }

      return { time: point.number("time"), position };
    });
  const segments = array(event.raw("segments"), "sighting segments").map((value) => {
    const segment = fields(value, "sighting segment");

    return {
      time: segment.number("time"),
      gap_seconds: segment.optionalNullableNumber("gap_seconds"),
      start_position: parsePosition(segment.raw("start_position"), "segment start position"),
      visible_seconds: segment.optionalNullableNumber("visible_seconds"),
      lost_position: parsePosition(segment.raw("lost_position"), "segment lost position"),
      route: parseRoute(segment.raw("route") ?? []),
    };
  });

  if (steamId !== null && typeof steamId !== "string") {
    throw new Error("Invalid sighting Steam ID");
  }
  if (playerName !== null && typeof playerName !== "string") {
    throw new Error("Invalid sighting player name");
  }
  if (heroName !== null && typeof heroName !== "string") {
    throw new Error("Invalid sighting hero evidence");
  }

  return {
    sample_tick: event.optionalNullableNumber("sample_tick"),
    time: event.number("time"),
    target_player_slot: event.optionalNullableNumber("target_player_slot"),
    target_steam_id: steamId,
    target_player_name: playerName,
    target_hero_name: heroName,
    target_is_radiant: event.optionalNullableBoolean("target_is_radiant"),
    target_position: parsePosition(event.raw("target_position"), "target position"),
    hidden_seconds: event.number("hidden_seconds"),
    segments,
    credit: event.number("credit"),
    observer_handles:
      event.raw("observer_handles") == null
        ? []
        : array(event.raw("observer_handles"), "observer handles").map((handle) =>
            number(handle, "observer handle"),
          ),
  };
}

function parseMeasurement(value: unknown): WardMeasurement | null {
  if (value === undefined || value === null) {
    return null;
  }

  const measurement = fields(value, "ward.measurement");
  const outcome = measurement.raw("outcome");

  if (
    typeof outcome !== "string" ||
    !["dewarded", "allied_removed", "expired", "match_ended", "replay_ended", "unknown"].includes(
      outcome,
    )
  ) {
    throw new Error("Invalid API field: ward.measurement.outcome");
  }

  return {
    version: measurement.number("version"),
    revision: measurement.optionalNullableNumber("revision") ?? 0,
    sightings:
      measurement.raw("sightings") == null
        ? []
        : array(measurement.raw("sightings"), "sightings").map(parseSighting),
    vision_complete: measurement.boolean("vision_complete"),
    placed_at_seconds: measurement.number("placed_at_seconds"),
    ended_at_seconds: measurement.number("ended_at_seconds"),
    outcome: outcome as WardMeasurement["outcome"],
    outcome_reason: String(measurement.raw("outcome_reason")),
    added_vision_seconds: measurement.nullableNumber("added_vision_seconds"),
    fresh_sightings: measurement.nullableNumber("fresh_sightings"),
    fresh_sighting_threshold_seconds: measurement.number("fresh_sighting_threshold_seconds"),
    vision_possible_seconds: measurement.number("vision_possible_seconds"),
    vision_measured_seconds: measurement.number("vision_measured_seconds"),
    vision_coverage: measurement.nullableNumber("vision_coverage"),
  };
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
    optionalNullableBoolean: (name: string) => optionalNullableBoolean(data[name], field(name)),
  };
}

export function parseWardEvidence(payload: unknown): WardEvidence {
  const evidence = fields(payload, "ward evidence");

  return {
    ward_id: evidence.number("ward_id"),
    measurement_version: evidence.optionalNullableNumber("measurement_version"),
    measurement_revision: evidence.optionalNullableNumber("measurement_revision"),
    sightings: array(evidence.raw("sightings"), "ward evidence sightings").map(parseSighting),
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
    scouting_score: ward.optionalNullableNumber("scouting_score"),
    scouting_tracking_seconds: ward.optionalNullableNumber("scouting_tracking_seconds"),
    scouting_discovery_seconds: ward.optionalNullableNumber("scouting_discovery_seconds"),
    scouting_version: ward.optionalNullableNumber("scouting_version"),
    scouting_tau_seconds: ward.optionalNullableNumber("scouting_tau_seconds"),
    scouting_complete: ward.optionalNullableBoolean("scouting_complete"),
    measurement: parseMeasurement(ward.raw("measurement")),
    game_version: ward.optionalNullableNumber("game_version"),
    map_asset_version: ward.optionalNullableNumber("map_asset_version"),
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

export function parseWardPopulation(payload: unknown): WardPopulation {
  const population = fields(payload, "ward population");

  return {
    matches: population.number("matches"),
    match_sides: population.number("match_sides"),
    selection_conditioned: population.boolean("selection_conditioned"),
  };
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
