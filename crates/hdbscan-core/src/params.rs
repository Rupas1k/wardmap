use crate::error::HdbscanError;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum ClusterSelectionMethod {
    #[default]
    Eom,
    Leaf,
}

#[derive(Debug, Clone)]
pub struct HdbscanParams {
    pub min_cluster_size: usize,
    pub min_samples: Option<usize>,
    pub cluster_selection_epsilon: f64,
    pub cluster_selection_method: ClusterSelectionMethod,
}

impl Default for HdbscanParams {
    fn default() -> Self {
        Self {
            min_cluster_size: 5,
            min_samples: None,
            cluster_selection_epsilon: 0.0,
            cluster_selection_method: ClusterSelectionMethod::default(),
        }
    }
}

impl HdbscanParams {
    pub fn validate(&self) -> Result<(), HdbscanError> {
        if self.min_cluster_size < 2 {
            return Err(HdbscanError::InvalidMinClusterSize(self.min_cluster_size));
        }

        if self.min_samples == Some(0) {
            return Err(HdbscanError::InvalidMinSamples(0));
        }

        if !self.cluster_selection_epsilon.is_finite() || self.cluster_selection_epsilon < 0.0 {
            return Err(HdbscanError::InvalidClusterSelectionEpsilon(
                self.cluster_selection_epsilon,
            ));
        }

        Ok(())
    }

    pub fn effective_min_samples(&self) -> usize {
        self.min_samples.unwrap_or(self.min_cluster_size)
    }
}
