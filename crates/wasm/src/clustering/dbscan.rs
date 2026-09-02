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
    min_samples: usize,
    wards: Vec<Ward>,
}

#[wasm_bindgen]
pub fn dbscan(value: JsValue) -> Result<JsValue, JsValue> {
    crate::utils::set_panic_hook();

    let params: Params = decode(value, "DBSCAN")?;

    validate_params(&params)?;
    validate_wards(&params.wards, false)?;

    let index = SpatialIndex::new(&params.wards, params.radius);
    let labels = cluster(&params, &index);
    let groups = group_wards(&params.wards, labels);

    serialize(&groups)
}

fn validate_params(params: &Params) -> Result<(), JsValue> {
    if !params.radius.is_finite() || params.radius <= 0.0 {
        return Err(js_error("radius must be a positive number"));
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
            .id
            .total_cmp(&params.wards[*right].id)
            .then_with(|| left.cmp(right))
    });

    for point in order {
        if labels[point] != UNVISITED {
            continue;
        }

        let neighbors = index.neighbors(point);

        if neighbors.len() < params.min_samples {
            labels[point] = NOISE;

            continue;
        }

        expand_cluster(
            index,
            &mut labels,
            point,
            neighbors,
            params.min_samples,
            next_cluster,
        );
        next_cluster += 1;
    }

    labels
}

fn expand_cluster(
    index: &SpatialIndex<'_>,
    labels: &mut [isize],
    point: usize,
    neighbors: Vec<usize>,
    min_samples: usize,
    cluster: isize,
) {
    labels[point] = cluster;

    let mut queued = vec![false; labels.len()];
    let mut queue = VecDeque::new();

    for neighbor in neighbors {
        if neighbor != point && !queued[neighbor] {
            queued[neighbor] = true;
            queue.push_back(neighbor);
        }
    }

    while let Some(candidate) = queue.pop_front() {
        queued[candidate] = false;

        if labels[candidate] >= 0 {
            continue;
        }

        let was_unvisited = labels[candidate] == UNVISITED;
        labels[candidate] = cluster;

        if !was_unvisited {
            continue;
        }

        let neighbors = index.neighbors(candidate);

        if neighbors.len() < min_samples {
            continue;
        }

        for neighbor in neighbors {
            if labels[neighbor] < 0 && !queued[neighbor] {
                queued[neighbor] = true;
                queue.push_back(neighbor);
            }
        }
    }
}
