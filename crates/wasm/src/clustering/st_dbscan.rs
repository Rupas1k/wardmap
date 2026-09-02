use serde::Deserialize;
use std::collections::VecDeque;
use wasm_bindgen::prelude::*;

use super::spatial::SpatialIndex;
use super::{decode, group_wards, js_error, serialize, validate_wards, Ward};

const UNVISITED: isize = -2;
const NOISE: isize = -1;

#[derive(Deserialize)]
struct Params {
    radius: f64,
    time_window: f64,
    min_samples: usize,
    wards: Vec<Ward>,
}

#[wasm_bindgen]
pub fn st_dbscan(value: JsValue) -> Result<JsValue, JsValue> {
    crate::utils::set_panic_hook();

    let params: Params = decode(value, "spatial-temporal DBSCAN")?;

    validate_params(&params)?;
    validate_wards(&params.wards, true)?;

    let index = SpatialIndex::new(&params.wards, params.radius);
    let labels = cluster(&params, &index);
    let groups = group_wards(&params.wards, labels);

    serialize(&groups)
}

fn validate_params(params: &Params) -> Result<(), JsValue> {
    if !params.radius.is_finite() || params.radius <= 0.0 {
        return Err(js_error("radius must be a positive number"));
    }
    if !params.time_window.is_finite() || params.time_window <= 0.0 {
        return Err(js_error("time_window must be a positive number"));
    }
    if params.min_samples < 1 {
        return Err(js_error("min_samples must be at least 1"));
    }

    Ok(())
}

fn cluster(params: &Params, index: &SpatialIndex<'_>) -> Vec<isize> {
    let mut labels = vec![UNVISITED; params.wards.len()];
    let mut order = (0..params.wards.len()).collect::<Vec<_>>();
    let mut next_cluster = 0;

    order.sort_unstable_by(|left, right| {
        params.wards[*left]
            .time_placed
            .total_cmp(&params.wards[*right].time_placed)
            .then_with(|| params.wards[*left].id.total_cmp(&params.wards[*right].id))
    });

    for point_index in order {
        if labels[point_index] != UNVISITED {
            continue;
        }

        let neighbors = neighbors(params, index, point_index);
        if neighbors.len() < params.min_samples {
            labels[point_index] = NOISE;

            continue;
        }

        expand_cluster(
            params,
            index,
            &mut labels,
            point_index,
            neighbors,
            next_cluster,
        );
        next_cluster += 1;
    }

    labels
}

fn expand_cluster(
    params: &Params,
    index: &SpatialIndex<'_>,
    labels: &mut [isize],
    point_index: usize,
    initial_neighbors: Vec<usize>,
    cluster_id: isize,
) {
    labels[point_index] = cluster_id;

    let mut minimum_time = params.wards[point_index].time_placed;
    let mut maximum_time = minimum_time;
    let mut queued = vec![false; params.wards.len()];
    let mut queue = VecDeque::new();

    for neighbor in initial_neighbors {
        if neighbor != point_index && !queued[neighbor] {
            queued[neighbor] = true;
            queue.push_back(neighbor);
        }
    }

    while let Some(candidate_index) = queue.pop_front() {
        queued[candidate_index] = false;

        if labels[candidate_index] >= 0 {
            continue;
        }

        let candidate_time = params.wards[candidate_index].time_placed;
        let next_minimum = minimum_time.min(candidate_time);
        let next_maximum = maximum_time.max(candidate_time);

        if next_maximum - next_minimum > params.time_window {
            continue;
        }

        let was_unvisited = labels[candidate_index] == UNVISITED;
        labels[candidate_index] = cluster_id;
        minimum_time = next_minimum;
        maximum_time = next_maximum;

        if !was_unvisited {
            continue;
        }

        let candidate_neighbors = neighbors(params, index, candidate_index);
        if candidate_neighbors.len() < params.min_samples {
            continue;
        }

        for neighbor in candidate_neighbors {
            if labels[neighbor] < 0 && !queued[neighbor] {
                queued[neighbor] = true;
                queue.push_back(neighbor);
            }
        }
    }
}

fn neighbors(params: &Params, index: &SpatialIndex<'_>, point_index: usize) -> Vec<usize> {
    let point = &params.wards[point_index];
    let mut neighbors = index
        .neighbors(point_index)
        .into_iter()
        .filter(|candidate| {
            (point.time_placed - params.wards[*candidate].time_placed).abs() <= params.time_window
        })
        .collect::<Vec<_>>();

    neighbors.sort_unstable_by(|left, right| {
        params.wards[*left]
            .time_placed
            .total_cmp(&params.wards[*right].time_placed)
            .then_with(|| params.wards[*left].id.total_cmp(&params.wards[*right].id))
            .then_with(|| left.cmp(right))
    });
    neighbors
}
