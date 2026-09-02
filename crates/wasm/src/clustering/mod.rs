mod dbscan;
mod hdbscan;
mod spatial;
mod st_dbscan;

use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt::Display;
use wasm_bindgen::JsValue;

pub use dbscan::dbscan;
pub use hdbscan::hdbscan;
pub use st_dbscan::st_dbscan;

#[derive(Serialize, Deserialize)]
pub(crate) struct Ward {
    pub(crate) id: f64,
    pub(crate) x_pos: f64,
    pub(crate) y_pos: f64,
    #[serde(default)]
    pub(crate) time_placed: f64,
}

pub(crate) fn decode<T: DeserializeOwned>(value: JsValue, name: &str) -> Result<T, JsValue> {
    serde_wasm_bindgen::from_value(value)
        .map_err(|error| js_error(format!("invalid {name} parameters: {error}")))
}

pub(crate) fn serialize(groups: &HashMap<isize, Vec<f64>>) -> Result<JsValue, JsValue> {
    serde_wasm_bindgen::to_value(groups)
        .map_err(|error| js_error(format!("failed to serialize clusters: {error}")))
}

pub(crate) fn js_error(error: impl Display) -> JsValue {
    JsValue::from_str(&error.to_string())
}

pub(crate) fn group_wards<I>(wards: &[Ward], labels: I) -> HashMap<isize, Vec<f64>>
where
    I: IntoIterator<Item = isize>,
{
    let mut groups = HashMap::new();

    for (ward, cluster_id) in wards.iter().zip(labels) {
        groups
            .entry(cluster_id)
            .or_insert_with(Vec::new)
            .push(ward.id);
    }

    groups
}

pub(crate) fn validate_wards(wards: &[Ward], include_time: bool) -> Result<(), JsValue> {
    let invalid = wards.iter().any(|ward| {
        !ward.id.is_finite()
            || !ward.x_pos.is_finite()
            || !ward.y_pos.is_finite()
            || include_time && !ward.time_placed.is_finite()
    });

    if invalid {
        Err(js_error("ward values must be finite"))
    } else {
        Ok(())
    }
}
