use crate::mst::MstEdge;
use ndarray::{ArrayView1, ArrayView2};

pub(crate) fn build(data: &ArrayView2<f64>, core_distances: &ArrayView1<f64>) -> Vec<MstEdge> {
    let point_count = data.nrows();
    if point_count <= 1 {
        return Vec::new();
    }

    let dimensions = data.ncols();
    let contiguous_data = data.as_standard_layout();
    let values = contiguous_data.as_slice().unwrap();
    let core_values = core_distances.as_slice().unwrap();
    let core_squared: Vec<f64> = core_values
        .iter()
        .map(|distance| distance * distance)
        .collect();
    let mut best_weights = vec![f64::INFINITY; point_count];
    let mut parents = vec![0; point_count];
    let mut active: Vec<usize> = (1..point_count).collect();
    let mut edges = Vec::with_capacity(point_count - 1);

    for &point in &active {
        let distance =
            crate::neighbors::euclidean::squared_euclidean_at(values, 0, point, dimensions);
        best_weights[point] = core_squared[0].max(core_squared[point]).max(distance);
    }

    while !active.is_empty() {
        let mut best_position = 0;
        let mut next_point = active[0];
        let mut best_weight = best_weights[next_point];

        for (position, &point) in active.iter().enumerate().skip(1) {
            let weight = best_weights[point];
            if weight < best_weight || (weight == best_weight && point < next_point) {
                best_position = position;
                next_point = point;
                best_weight = weight;
            }
        }

        edges.push(MstEdge {
            source: parents[next_point],
            target: next_point,
            weight: best_weight.sqrt(),
        });
        active.swap_remove(best_position);

        if active.len() > 64 && active.len().is_multiple_of(128) {
            active.sort_unstable();
        }

        for &candidate in &active {
            if core_squared[next_point] >= best_weights[candidate]
                || core_squared[candidate] >= best_weights[candidate]
            {
                continue;
            }

            let distance = crate::neighbors::euclidean::squared_euclidean_at(
                values, next_point, candidate, dimensions,
            );
            if distance >= best_weights[candidate] {
                continue;
            }

            let weight = core_squared[next_point]
                .max(core_squared[candidate])
                .max(distance);
            if weight < best_weights[candidate] {
                best_weights[candidate] = weight;
                parents[candidate] = next_point;
            }
        }
    }

    edges
}
