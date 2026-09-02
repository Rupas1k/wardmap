use hdbscan_core::{cluster, ClusterSelectionMethod, HdbscanParams};
use ndarray::Array2;
use serde::Deserialize;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

use super::{decode, group_wards, js_error, serialize, validate_wards, Ward};

const TEMPORAL_REFERENCE_DISTANCE: f64 = 160.0;

#[derive(Deserialize)]
struct Params {
    min_cluster_size: usize,
    min_samples: usize,
    #[serde(default)]
    epsilon: f64,
    #[serde(default)]
    selection_method: SelectionMethod,
    #[serde(default)]
    time_weight_scale_seconds: Option<f64>,
    wards: Vec<Ward>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "lowercase")]
enum SelectionMethod {
    #[default]
    Eom,
    Leaf,
}

impl From<SelectionMethod> for ClusterSelectionMethod {
    fn from(method: SelectionMethod) -> Self {
        match method {
            SelectionMethod::Eom => Self::Eom,
            SelectionMethod::Leaf => Self::Leaf,
        }
    }
}

#[wasm_bindgen]
pub fn hdbscan(value: JsValue) -> Result<JsValue, JsValue> {
    crate::utils::set_panic_hook();

    let params: Params = decode(value, "HDBSCAN")?;

    validate_params(&params)?;
    validate_wards(&params.wards, params.time_weight_scale_seconds.is_some())?;

    if params.wards.is_empty() {
        return serialize(&HashMap::new());
    }
    if params.wards.len() < params.min_cluster_size || params.wards.len() < params.min_samples {
        let groups = group_wards(&params.wards, std::iter::repeat_n(-1, params.wards.len()));

        return serialize(&groups);
    }

    let data = coordinates(&params)?;
    let model_params = HdbscanParams {
        min_cluster_size: params.min_cluster_size,
        min_samples: Some(params.min_samples),
        cluster_selection_epsilon: params.epsilon,
        cluster_selection_method: params.selection_method.into(),
    };
    let labels = cluster(&data.view(), &model_params)
        .map_err(|error| js_error(format!("HDBSCAN failed: {error}")))?;
    let groups = group_wards(
        &params.wards,
        labels.into_iter().map(|label| label as isize),
    );

    serialize(&groups)
}

fn validate_params(params: &Params) -> Result<(), JsValue> {
    if params.min_cluster_size < 2 {
        return Err(js_error("min_cluster_size must be at least 2"));
    }
    if params.min_samples < 1 {
        return Err(js_error("min_samples must be at least 1"));
    }
    if !params.epsilon.is_finite() || params.epsilon < 0.0 {
        return Err(js_error("epsilon must be a non-negative number"));
    }
    if params
        .time_weight_scale_seconds
        .is_some_and(|seconds| !seconds.is_finite() || seconds <= 0.0)
    {
        return Err(js_error(
            "time_weight_scale_seconds must be a positive number",
        ));
    }

    Ok(())
}

fn coordinates(params: &Params) -> Result<Array2<f64>, JsValue> {
    let dimensions = if params.time_weight_scale_seconds.is_some() {
        3
    } else {
        2
    };
    let minimum_time = params
        .wards
        .iter()
        .map(|ward| ward.time_placed)
        .min_by(f64::total_cmp)
        .unwrap_or(0.0);
    let time_weight = params
        .time_weight_scale_seconds
        .map(|seconds| TEMPORAL_REFERENCE_DISTANCE / seconds);
    let mut coordinates = Vec::with_capacity(params.wards.len() * dimensions);

    for ward in &params.wards {
        coordinates.extend([ward.x_pos, ward.y_pos]);

        if let Some(weight) = time_weight {
            coordinates.push((ward.time_placed - minimum_time) * weight);
        }
    }

    Array2::from_shape_vec((params.wards.len(), dimensions), coordinates)
        .map_err(|error| js_error(format!("invalid HDBSCAN coordinates: {error}")))
}
