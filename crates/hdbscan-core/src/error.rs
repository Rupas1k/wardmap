use thiserror::Error;

#[derive(Debug, Error)]
pub enum HdbscanError {
    #[error("input data must have at least one point")]
    EmptyData,

    #[error("input data contains NaN or infinite values")]
    InvalidData,

    #[error("expected 2 or 3 dimensions, got {0}")]
    UnsupportedDimensions(usize),

    #[error("min_cluster_size must be at least 2, got {0}")]
    InvalidMinClusterSize(usize),

    #[error("min_samples must be at least 1, got {0}")]
    InvalidMinSamples(usize),

    #[error("min_samples ({min_samples}) exceeds number of points ({point_count})")]
    MinSamplesExceedsData {
        min_samples: usize,
        point_count: usize,
    },

    #[error("cluster_selection_epsilon must be a non-negative finite number, got {0}")]
    InvalidClusterSelectionEpsilon(f64),
}
