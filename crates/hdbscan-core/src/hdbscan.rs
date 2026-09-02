use ndarray::ArrayView2;

use crate::error::HdbscanError;
use crate::hierarchy;
use crate::mst;
use crate::neighbors::{self, KdTree};
use crate::params::HdbscanParams;

pub fn cluster(data: &ArrayView2<f64>, params: &HdbscanParams) -> Result<Vec<i32>, HdbscanError> {
    params.validate()?;
    validate_data(data)?;

    let point_count = data.nrows();
    let min_samples = params.effective_min_samples();

    if min_samples > point_count {
        return Err(HdbscanError::MinSamplesExceedsData {
            min_samples,
            point_count,
        });
    }

    let mst_edges = build_mst(data, min_samples);
    let single_linkage = hierarchy::build_linkage(&mst_edges, point_count);
    let condensed = hierarchy::condense(&single_linkage, point_count, params.min_cluster_size);
    let selected_clusters = hierarchy::select_clusters(
        &condensed,
        point_count,
        params.cluster_selection_method,
        params.cluster_selection_epsilon,
    );

    Ok(hierarchy::assign_labels(
        &condensed,
        &selected_clusters,
        point_count,
    ))
}

fn build_mst(data: &ArrayView2<f64>, min_samples: usize) -> Vec<mst::MstEdge> {
    let point_count = data.nrows();

    if point_count <= mst::PRIM_POINT_LIMIT {
        let core_distances = neighbors::core_distances(data, min_samples);
        return mst::build_prim(data, &core_distances.view());
    }

    let tree = KdTree::build(data);
    let (core_distances, neighbor_indices, neighbors_per_point) =
        neighbors::core_distances_with_neighbors(&tree, data, min_samples);

    mst::build_boruvka(
        &tree,
        &core_distances.view(),
        &neighbor_indices,
        neighbors_per_point,
    )
}

fn validate_data(data: &ArrayView2<f64>) -> Result<(), HdbscanError> {
    if data.nrows() == 0 {
        return Err(HdbscanError::EmptyData);
    }

    if !matches!(data.ncols(), 2 | 3) {
        return Err(HdbscanError::UnsupportedDimensions(data.ncols()));
    }

    if data.iter().any(|value| !value.is_finite()) {
        return Err(HdbscanError::InvalidData);
    }

    Ok(())
}
