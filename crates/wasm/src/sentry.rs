use serde::Serialize;
use std::collections::{HashMap, HashSet};
use wasm_bindgen::prelude::*;

const GRID_ORIGIN: f64 = 7461.0;
const GRID_SIZE: f64 = 64.0;
const DETECTION_RADIUS: f64 = 1050.0;
const CELL_HALF_DIAGONAL: f64 = 45.254_833_995_939_045;
const COARSE_RADIUS: f64 = DETECTION_RADIUS + CELL_HALF_DIAGONAL;
const SUBCELL_STEP: i32 = 16;
const REFINEMENT_STEP: i32 = 4;

struct Target {
    match_id: u64,
    x: f64,
    y: f64,
}

#[derive(Clone, Copy)]
struct Candidate {
    score: usize,
    x: f64,
    y: f64,
}

struct CandidateSearch<'a> {
    columns: usize,
    rows: usize,
    valid_cells: &'a [bool],
    placements: &'a [Placement],
    minimum_spacing: f64,
    targets: &'a [Target],
    target_buckets: &'a HashMap<(i64, i64), Vec<usize>>,
    covered: &'a [bool],
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Placement {
    rank: usize,
    x: f64,
    y: f64,
    additional_wards: usize,
    covered_wards: usize,
    total_wards: usize,
    relevant_matches: usize,
    expected_per_match: f64,
    coverage: f64,
}

#[wasm_bindgen]
pub fn plan_sentries(
    target_values: Vec<f64>,
    grid: Vec<i16>,
    rows: usize,
    columns: usize,
    requested_count: usize,
    minimum_spacing: f64,
) -> Result<JsValue, JsValue> {
    let targets = parse_targets(&target_values)?;
    let cell_count = rows
        .checked_mul(columns)
        .ok_or_else(|| error("Grid dimensions are too large"))?;

    if grid.len() != cell_count {
        return Err(error("Grid dimensions do not match its data"));
    }
    if !minimum_spacing.is_finite() || minimum_spacing < 0.0 {
        return Err(error("Minimum spacing must be a non-negative number"));
    }

    let placements = calculate(
        &targets,
        &grid,
        rows,
        columns,
        requested_count,
        minimum_spacing,
    );

    serde_wasm_bindgen::to_value(&placements)
        .map_err(|reason| error(format!("Unable to serialize sentry placements: {reason}")))
}

fn parse_targets(values: &[f64]) -> Result<Vec<Target>, JsValue> {
    if !values.len().is_multiple_of(3) {
        return Err(error("Sentry targets must contain match, x, and y values"));
    }

    values
        .chunks_exact(3)
        .map(|values| {
            let match_id = values[0];
            let x = values[1];
            let y = values[2];

            if !match_id.is_finite() || match_id < 0.0 || !x.is_finite() || !y.is_finite() {
                return Err(error("Sentry target values must be finite"));
            }

            Ok(Target {
                match_id: match_id as u64,
                x,
                y,
            })
        })
        .collect()
}

fn calculate(
    targets: &[Target],
    grid: &[i16],
    rows: usize,
    columns: usize,
    requested_count: usize,
    minimum_spacing: f64,
) -> Vec<Placement> {
    if targets.is_empty() || requested_count == 0 || rows == 0 || columns == 0 {
        return Vec::new();
    }

    let valid_cells = grid
        .iter()
        .map(|value| *value >= 0 && value & 1 == 0)
        .collect::<Vec<_>>();
    let mut scores = vec![0_i32; rows * columns];

    for target in targets {
        visit_cells(target.x, target.y, COARSE_RADIUS, columns, rows, |index| {
            if valid_cells[index] {
                scores[index] += 1;
            }
        });
    }

    let target_buckets = build_target_buckets(targets);
    let relevant_matches = targets
        .iter()
        .map(|target| target.match_id)
        .collect::<HashSet<_>>()
        .len();
    let mut covered = vec![false; targets.len()];
    let mut placements = Vec::with_capacity(requested_count);
    let mut covered_wards = 0;

    for rank in 1..=requested_count {
        let search = CandidateSearch {
            columns,
            rows,
            valid_cells: &valid_cells,
            placements: &placements,
            minimum_spacing,
            targets,
            target_buckets: &target_buckets,
            covered: &covered,
        };
        let candidate = refine_candidate(&search, &strongest_cells(&scores), &scores);

        let Some(candidate) = candidate.filter(|candidate| candidate.score > 0) else {
            break;
        };

        if minimum_spacing > 0.0 {
            let excluded_radius = (minimum_spacing - CELL_HALF_DIAGONAL).max(0.0);

            visit_cells(
                candidate.x,
                candidate.y,
                excluded_radius,
                columns,
                rows,
                |index| scores[index] = 0,
            );
        }

        let mut additional_wards = 0;

        for (target_index, target) in targets.iter().enumerate() {
            if covered[target_index]
                || squared_distance(candidate.x, candidate.y, target.x, target.y)
                    > DETECTION_RADIUS * DETECTION_RADIUS
            {
                continue;
            }

            covered[target_index] = true;
            additional_wards += 1;

            visit_cells(target.x, target.y, COARSE_RADIUS, columns, rows, |index| {
                if scores[index] > 0 {
                    scores[index] -= 1;
                }
            });
        }

        covered_wards += additional_wards;
        placements.push(Placement {
            rank,
            x: candidate.x,
            y: candidate.y,
            additional_wards,
            covered_wards,
            total_wards: targets.len(),
            relevant_matches,
            expected_per_match: additional_wards as f64 / relevant_matches as f64,
            coverage: covered_wards as f64 / targets.len() as f64,
        });
    }

    placements
}

fn strongest_cells(scores: &[i32]) -> Vec<usize> {
    let mut cells = scores
        .iter()
        .enumerate()
        .filter_map(|(index, score)| (*score > 0).then_some(index))
        .collect::<Vec<_>>();

    cells.sort_unstable_by(|left, right| {
        scores[*right]
            .cmp(&scores[*left])
            .then_with(|| left.cmp(right))
    });
    cells
}

fn refine_candidate(
    search: &CandidateSearch<'_>,
    coarse_cells: &[usize],
    coarse_scores: &[i32],
) -> Option<Candidate> {
    let mut best = None;

    for &index in coarse_cells {
        if best.is_some_and(|candidate: Candidate| coarse_scores[index] < candidate.score as i32) {
            break;
        }

        let center_x = GRID_ORIGIN + (index % search.columns) as f64 * GRID_SIZE;
        let center_y = GRID_ORIGIN + (index / search.columns) as f64 * GRID_SIZE;

        for y_offset in (-24..=24).step_by(SUBCELL_STEP as usize) {
            for x_offset in (-24..=24).step_by(SUBCELL_STEP as usize) {
                let candidate = Candidate {
                    x: center_x + x_offset as f64,
                    y: center_y + y_offset as f64,
                    score: 0,
                };

                best = evaluate_candidate(search, best, candidate);
            }
        }
    }

    let coarse_best = best?;
    let mut refined = Some(coarse_best);

    for y_offset in (-8..=8).step_by(REFINEMENT_STEP as usize) {
        for x_offset in (-8..=8).step_by(REFINEMENT_STEP as usize) {
            refined = evaluate_candidate(
                search,
                refined,
                Candidate {
                    x: coarse_best.x + x_offset as f64,
                    y: coarse_best.y + y_offset as f64,
                    score: 0,
                },
            );
        }
    }

    refined
}

fn evaluate_candidate(
    search: &CandidateSearch<'_>,
    current: Option<Candidate>,
    mut candidate: Candidate,
) -> Option<Candidate> {
    if !candidate_is_valid(
        candidate.x,
        candidate.y,
        search.columns,
        search.rows,
        search.valid_cells,
    ) || !candidate_is_spaced(
        candidate.x,
        candidate.y,
        search.placements,
        search.minimum_spacing,
    ) {
        return current;
    }

    candidate.score = score_candidate(
        candidate.x,
        candidate.y,
        search.targets,
        search.target_buckets,
        search.covered,
    );

    match current {
        Some(current) if !candidate_is_better(candidate, current) => Some(current),
        _ => Some(candidate),
    }
}

fn candidate_is_better(candidate: Candidate, current: Candidate) -> bool {
    candidate.score > current.score
        || candidate.score == current.score
            && (candidate.y < current.y || candidate.y == current.y && candidate.x < current.x)
}

fn candidate_is_valid(x: f64, y: f64, columns: usize, rows: usize, valid_cells: &[bool]) -> bool {
    let column = ((x - GRID_ORIGIN) / GRID_SIZE).round() as isize;
    let row = ((y - GRID_ORIGIN) / GRID_SIZE).round() as isize;

    column >= 0
        && column < columns as isize
        && row >= 0
        && row < rows as isize
        && valid_cells[row as usize * columns + column as usize]
}

fn candidate_is_spaced(x: f64, y: f64, placements: &[Placement], minimum_spacing: f64) -> bool {
    let minimum_squared = minimum_spacing * minimum_spacing;

    placements
        .iter()
        .all(|placement| squared_distance(x, y, placement.x, placement.y) >= minimum_squared)
}

fn build_target_buckets(targets: &[Target]) -> HashMap<(i64, i64), Vec<usize>> {
    let mut buckets = HashMap::new();

    for (index, target) in targets.iter().enumerate() {
        buckets
            .entry(target_bucket(target.x, target.y))
            .or_insert_with(Vec::new)
            .push(index);
    }

    buckets
}

fn score_candidate(
    x: f64,
    y: f64,
    targets: &[Target],
    target_buckets: &HashMap<(i64, i64), Vec<usize>>,
    covered: &[bool],
) -> usize {
    let (bucket_x, bucket_y) = target_bucket(x, y);
    let radius_squared = DETECTION_RADIUS * DETECTION_RADIUS;
    let mut score = 0;

    for x_offset in -1..=1 {
        for y_offset in -1..=1 {
            let Some(candidates) = target_buckets.get(&(bucket_x + x_offset, bucket_y + y_offset))
            else {
                continue;
            };

            for &target_index in candidates {
                let target = &targets[target_index];

                if !covered[target_index]
                    && squared_distance(x, y, target.x, target.y) <= radius_squared
                {
                    score += 1;
                }
            }
        }
    }

    score
}

fn target_bucket(x: f64, y: f64) -> (i64, i64) {
    (
        (x / DETECTION_RADIUS).floor() as i64,
        (y / DETECTION_RADIUS).floor() as i64,
    )
}

fn visit_cells(
    x: f64,
    y: f64,
    radius: f64,
    columns: usize,
    rows: usize,
    mut visit: impl FnMut(usize),
) {
    let minimum_column = (((x - radius - GRID_ORIGIN) / GRID_SIZE).ceil() as isize)
        .clamp(0, columns.saturating_sub(1) as isize) as usize;
    let maximum_column = (((x + radius - GRID_ORIGIN) / GRID_SIZE).floor() as isize)
        .clamp(0, columns.saturating_sub(1) as isize) as usize;
    let minimum_row = (((y - radius - GRID_ORIGIN) / GRID_SIZE).ceil() as isize)
        .clamp(0, rows.saturating_sub(1) as isize) as usize;
    let maximum_row = (((y + radius - GRID_ORIGIN) / GRID_SIZE).floor() as isize)
        .clamp(0, rows.saturating_sub(1) as isize) as usize;
    let radius_squared = radius * radius;

    for row in minimum_row..=maximum_row {
        let candidate_y = GRID_ORIGIN + row as f64 * GRID_SIZE;

        for column in minimum_column..=maximum_column {
            let candidate_x = GRID_ORIGIN + column as f64 * GRID_SIZE;

            if squared_distance(x, y, candidate_x, candidate_y) <= radius_squared {
                visit(row * columns + column);
            }
        }
    }
}

fn squared_distance(left_x: f64, left_y: f64, right_x: f64, right_y: f64) -> f64 {
    let delta_x = left_x - right_x;
    let delta_y = left_y - right_y;

    delta_x * delta_x + delta_y * delta_y
}

fn error(message: impl AsRef<str>) -> JsValue {
    JsValue::from_str(message.as_ref())
}
