use super::heap::KnnHeap;
use super::kd_tree::KdTree;
use ndarray::{Array1, ArrayView2};

pub(crate) fn calculate(data: &ArrayView2<f64>, min_samples: usize) -> Array1<f64> {
    let tree = KdTree::build(data);
    query(&tree, data, min_samples.min(data.nrows()), false).0
}

pub(crate) fn calculate_with_neighbors(
    tree: &KdTree,
    data: &ArrayView2<f64>,
    min_samples: usize,
) -> (Array1<f64>, Vec<usize>) {
    query(tree, data, min_samples.min(data.nrows()), true)
}

fn query(
    tree: &KdTree,
    data: &ArrayView2<f64>,
    neighbor_limit: usize,
    collect_neighbors: bool,
) -> (Array1<f64>, Vec<usize>) {
    let point_count = data.nrows();
    let dimensions = data.ncols();
    let neighbors_per_point = neighbor_limit.saturating_sub(1);
    let mut distances = Array1::zeros(point_count);
    let mut neighbors = if collect_neighbors {
        vec![0; point_count * neighbors_per_point]
    } else {
        Vec::new()
    };
    let contiguous_data = data.as_standard_layout();
    let values = contiguous_data.as_slice().unwrap();
    let mut heap = KnnHeap::new(neighbor_limit);
    let mut neighbor_buffer = vec![0; neighbors_per_point];

    for point in 0..point_count {
        heap.clear();
        let coordinates = &values[point * dimensions..(point + 1) * dimensions];

        tree.search(coordinates, &mut heap);
        distances[point] = heap.max_distance_squared().sqrt();

        if collect_neighbors {
            let written = heap.all_neighbors(point, &mut neighbor_buffer);
            let start = point * neighbors_per_point;
            neighbors[start..start + written].copy_from_slice(&neighbor_buffer[..written]);
        }
    }

    (distances, neighbors)
}
