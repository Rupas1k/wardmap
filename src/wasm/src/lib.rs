mod utils;

use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use serde_wasm_bindgen;
use wasm_bindgen::prelude::*;
use linfa::traits::*;
use linfa_clustering::{AppxDbscan};
use ndarray::{Array2};

#[wasm_bindgen]
extern {
    fn alert(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[derive(Serialize, Deserialize)]
pub struct Ward {
    pub id: f64,
    pub x_pos: f64,
    pub y_pos: f64,
}

#[wasm_bindgen]
pub fn dbscan_linfa(js_object: JsValue) -> JsValue {
    #[derive(Serialize, Deserialize)]
    struct JsParams {
        pub eps: f64,
        pub min_samples: usize,
        pub wards: Vec<Ward>
    }

    let js_params: JsParams = serde_wasm_bindgen::from_value(js_object).unwrap();

    let arr: Array2<f64> = js_params.wards.iter()
        .map(|ward| [ward.x_pos, ward.y_pos])
        .collect::<Vec<_>>()
        .into();

    let clusters = AppxDbscan::params(js_params.min_samples)
                    .tolerance(js_params.eps)
                    .slack(1.)
                    .transform(&arr)
                    .unwrap();

    let mut grouped_data: HashMap<isize, Vec<f64>> = HashMap::new();
    for (idx, cluster_id_option) in clusters.iter().enumerate() {
        let cluster_id = cluster_id_option.unwrap_or(usize::MAX) as isize;
        grouped_data.entry(cluster_id)
            .or_insert(Vec::new())
            .push(js_params.wards[idx].id);
    }

    serde_wasm_bindgen::to_value(&grouped_data).unwrap()
}
