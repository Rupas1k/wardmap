use hdbscan_core::{cluster, ClusterSelectionMethod, HdbscanError, HdbscanParams};
use ndarray::array;

fn test_params() -> HdbscanParams {
    HdbscanParams {
        min_cluster_size: 2,
        min_samples: Some(2),
        cluster_selection_epsilon: 0.0,
        cluster_selection_method: ClusterSelectionMethod::Leaf,
    }
}

#[test]
fn separates_dense_groups() {
    let points = array![
        [0.0, 0.0],
        [0.0, 0.1],
        [0.1, 0.0],
        [10.0, 10.0],
        [10.0, 10.1],
        [10.1, 10.0],
    ];

    let labels = cluster(&points.view(), &test_params()).expect("clustering should succeed");

    assert!(labels[0] >= 0);
    assert_eq!(labels[0], labels[1]);
    assert_eq!(labels[1], labels[2]);
    assert!(labels[3] >= 0);
    assert_eq!(labels[3], labels[4]);
    assert_eq!(labels[4], labels[5]);
    assert_ne!(labels[0], labels[3]);
}

#[test]
fn rejects_non_finite_coordinates() {
    let points = array![[0.0, 0.0], [f64::NAN, 1.0]];

    let error = cluster(&points.view(), &test_params()).expect_err("NaN must be rejected");

    assert!(matches!(error, HdbscanError::InvalidData));
}

#[test]
fn rejects_min_samples_above_point_count() {
    let points = array![[0.0, 0.0], [1.0, 1.0]];
    let params = HdbscanParams {
        min_samples: Some(3),
        ..test_params()
    };

    let error = cluster(&points.view(), &params).expect_err("invalid sample size must fail");

    assert!(matches!(
        error,
        HdbscanError::MinSamplesExceedsData {
            min_samples: 3,
            point_count: 2
        }
    ));
}
