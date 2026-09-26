mod clustering;
mod utils;

use wasm_bindgen::prelude::*;

pub use clustering::{dbscan, hdbscan, st_dbscan};
#[wasm_bindgen]
pub fn elevation_data(map_version: u8) -> Result<Vec<u8>, JsError> {
    wardmap_parser::elevation_data(map_version)
        .map(<[u8]>::to_vec)
        .ok_or_else(|| JsError::new(&format!("Unsupported map version {map_version}")))
}
