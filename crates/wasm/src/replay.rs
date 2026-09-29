use std::io::Read;

use serde_json::{json, Value};
use wasm_bindgen::prelude::*;

const MAX_REPLAY_BYTES: u64 = 512 * 1024 * 1024;
const STEAM_ID_BASE: u64 = 76_561_197_960_265_728;

fn account_id(steam_id: u64) -> Option<u32> {
    steam_id
        .checked_sub(STEAM_ID_BASE)
        .and_then(|id| u32::try_from(id).ok())
        .filter(|id| *id != 0)
}

fn replay_bytes(data: &[u8]) -> Result<Vec<u8>, String> {
    let bytes = if data.starts_with(b"BZh") {
        let mut result = Vec::new();
        bzip2::read::MultiBzDecoder::new(data)
            .take(MAX_REPLAY_BYTES + 1)
            .read_to_end(&mut result)
            .map_err(|error| format!("Unable to decompress replay: {error}"))?;
        result
    } else {
        data.to_vec()
    };
    if bytes.len() as u64 > MAX_REPLAY_BYTES {
        return Err("Replay exceeds the 512 MB decompressed limit".into());
    }
    if !bytes.starts_with(b"PBDEMS2\0") {
        return Err("Not a Source 2 Dota replay. Choose a .dem or .dem.bz2 file".into());
    }
    Ok(bytes)
}

fn convert(replay: wardmap_parser::Replay) -> Result<Value, String> {
    let metadata = replay.metadata;
    let match_id = metadata
        .match_id
        .filter(|id| *id > 0 && *id <= 9_007_199_254_740_991)
        .ok_or("Replay has no valid match ID")?;
    let duration = metadata.game_duration_seconds.map(f64::from);
    let radiant_won = match metadata.game_winner {
        Some(2) => Some(true),
        Some(3) => Some(false),
        _ => None,
    };
    let player_name = |id: Option<u32>| {
        metadata
            .players
            .iter()
            .find(|player| id.is_some() && player.steam_id.and_then(account_id) == id)
            .and_then(|player| player.name.clone())
    };
    let players: Vec<Value> = metadata.players.iter().filter_map(|player| {
        let id = player.steam_id.and_then(account_id)?;
        if !matches!(player.team, Some(2 | 3)) { return None; }
        Some(json!({ "id": id, "name": player.name.clone().unwrap_or_else(|| format!("Player {id}")),
            "hero": player.hero_name, "isRadiant": player.team == Some(2) }))
    }).collect();
    let wards = replay.wards.into_iter().filter(|ward| !ward.post_game).enumerate().map(|(index, ward)| {
        let measurement: Value = serde_json::from_str(ward.measurement_json.as_deref().ok_or("Ward measurement missing")?)
            .map_err(|error| error.to_string())?;
        let destroyed = matches!(measurement["outcome"].as_str(), Some("dewarded" | "allied_removed"));
        let placed_id = account_id(ward.player_placed_steam_id);
        let destroyed_id = if destroyed { ward.player_destroyed_steam_id.and_then(account_id) } else { None };
        let (team_id, opponent_id, team_name, opponent_name) = if ward.is_radiant {
            (metadata.radiant_team_id, metadata.dire_team_id, &metadata.radiant_team_tag, &metadata.dire_team_tag)
        } else { (metadata.dire_team_id, metadata.radiant_team_id, &metadata.dire_team_tag, &metadata.radiant_team_tag) };
        Ok(json!({
            "id": -(index as i64 + 1), "match_id": match_id,
            "player_placed_id": placed_id, "player_name": player_name(placed_id),
            "player_destroyed_id": destroyed_id, "player_destroyed_name": player_name(destroyed_id),
            "is_radiant": ward.is_radiant, "is_obs": ward.is_obs, "is_destroyed": destroyed,
            "time_placed": ward.time_placed, "duration": ward.duration,
            "scouting_tracking_seconds": ward.scouting_tracking_seconds,
            "scouting_discovery_seconds": ward.scouting_discovery_seconds,
            "measurement": measurement,
            "x_pos": i32::from(ward.x) * 128 + ward.vec_x.round() as i32,
            "y_pos": i32::from(ward.y) * 128 + ward.vec_y.round() as i32,
            "z_pos": i32::from(ward.z) * 128 + ward.vec_z.round() as i32,
            "radiant_networth": ward.radiant_networth, "dire_networth": ward.dire_networth,
            "match_duration": duration, "team_id": team_id.filter(|id| *id > 0), "team_name": team_name,
            "opponent_team_id": opponent_id.filter(|id| *id > 0), "opponent_team_name": opponent_name,
            "team_won": radiant_won.map(|won| won == ward.is_radiant)
        }))
    }).collect::<Result<Vec<_>, String>>()?;
    Ok(json!({ "matchId": match_id, "duration": duration,
        "startedAt": metadata.end_time.zip(duration).map(|(end, seconds)| (f64::from(end) - seconds) * 1000.0),
        "radiantWon": radiant_won, "players": players, "wards": wards }))
}

#[wasm_bindgen]
pub fn parse_replay(data: &[u8], map_version: u8) -> Result<String, JsError> {
    let bytes = replay_bytes(data).map_err(|error| JsError::new(&error))?;
    let replay = wardmap_parser::parse_replay(&bytes, map_version)
        .map_err(|error| JsError::new(&format!("Unable to parse replay: {error}")))?;
    let result = convert(replay).map_err(|error| JsError::new(&error))?;
    Ok(result.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn steam_ids_are_converted_without_float_precision_loss() {
        assert_eq!(account_id(STEAM_ID_BASE + 123456789), Some(123456789));
        assert_eq!(account_id(0), None);
        assert_eq!(account_id(STEAM_ID_BASE), None);
    }

    #[test]
    fn conversion_preserves_coordinates_identity_and_unknown_metadata() {
        use wardmap_parser::{Output, Replay, ReplayMetadata, ReplayPlayer};
        let metadata = ReplayMetadata {
            playback_time_seconds: None,
            game_duration_seconds: None,
            playback_ticks: None,
            playback_frames: None,
            match_id: Some(8_000_000_001),
            game_mode: None,
            game_winner: None,
            league_id: None,
            radiant_team_id: None,
            dire_team_id: None,
            radiant_team_tag: None,
            dire_team_tag: None,
            end_time: None,
            players: vec![ReplayPlayer {
                steam_id: Some(STEAM_ID_BASE + 123456789),
                name: Some("Player".into()),
                hero_name: None,
                team: Some(2),
                is_fake_client: Some(false),
            }],
        };
        let ward = Output {
            time_placed: -60,
            duration: 360,
            is_obs: true,
            is_radiant: true,
            event: "expired".into(),
            post_game: false,
            player_placed_steam_id: STEAM_ID_BASE + 123456789,
            player_destroyed_steam_id: Some(STEAM_ID_BASE + 42),
            npc_killed: None,
            x: 128,
            y: 129,
            z: 130,
            vec_x: 32.0,
            vec_y: 16.0,
            vec_z: 0.0,
            radiant_networth: 1000,
            dire_networth: 2000,
            enemy_hero_vision_seconds: 0.0,
            unique_enemy_hero_vision_seconds: 0.0,
            heroes_spotted: 0,
            hero_reveal_events: 0,
            unique_hero_reveal_events: 0,
            scouting_tracking_seconds: Some(5.0),
            scouting_discovery_seconds: Some(2.0),
            scouting_score: None,
            scouting_version: None,
            scouting_tau_seconds: None,
            scouting_complete: None,
            measurement_json: Some(r#"{"outcome":"expired","sightings":[]}"#.into()),
        };
        let mut post_game = ward.clone();
        post_game.post_game = true;
        let result = convert(Replay {
            metadata,
            wards: vec![ward, post_game],
        })
        .unwrap();
        assert_eq!(result["matchId"], 8_000_000_001_u64);
        assert!(result["duration"].is_null());
        assert!(result["startedAt"].is_null());
        assert!(result["radiantWon"].is_null());
        assert_eq!(result["wards"].as_array().unwrap().len(), 1);
        let ward = &result["wards"][0];
        assert_eq!(ward["x_pos"], 16416);
        assert_eq!(ward["y_pos"], 16528);
        assert_eq!(ward["player_placed_id"], 123456789);
        assert_eq!(ward["player_name"], "Player");
        assert!(ward["player_destroyed_id"].is_null());
        assert!(ward["team_won"].is_null());
        assert_eq!(ward["time_placed"], -60);
        assert_eq!(ward["measurement"]["outcome"], "expired");
    }

    #[test]
    fn validates_and_decompresses_replay_contents() {
        let bytes = b"PBDEMS2\0test";
        let mut encoder = bzip2::write::BzEncoder::new(Vec::new(), bzip2::Compression::default());
        encoder.write_all(bytes).unwrap();
        assert_eq!(replay_bytes(&encoder.finish().unwrap()).unwrap(), bytes);
        assert_eq!(replay_bytes(bytes).unwrap(), bytes);
        assert!(replay_bytes(b"not a replay").is_err());
        assert!(replay_bytes(b"BZh9broken").is_err());
    }
}
