mod core_distance;
pub(crate) mod euclidean;
mod heap;
mod kd_tree;

use ndarray::{Array1, ArrayView2};

const MISSING_NODE: usize = usize::MAX;

pub(crate) use kd_tree::KdTree;

pub(crate) fn core_distances(data: &ArrayView2<f64>, min_samples: usize) -> Array1<f64> {
    core_distance::calculate(data, min_samples)
}

pub(crate) fn core_distances_with_neighbors(
    tree: &KdTree,
    data: &ArrayView2<f64>,
    min_samples: usize,
) -> (Array1<f64>, Vec<usize>, usize) {
    let neighbor_count = min_samples.min(data.nrows()).saturating_sub(1);
    let (distances, neighbors) = core_distance::calculate_with_neighbors(tree, data, min_samples);

    (distances, neighbors, neighbor_count)
}
