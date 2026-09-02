use std::collections::HashMap;

use super::Ward;

pub(crate) struct SpatialIndex<'a> {
    wards: &'a [Ward],
    radius: f64,
    radius_squared: f64,
    buckets: HashMap<(i64, i64), Vec<usize>>,
}

impl<'a> SpatialIndex<'a> {
    pub(crate) fn new(wards: &'a [Ward], radius: f64) -> Self {
        let mut buckets = HashMap::new();

        for (index, ward) in wards.iter().enumerate() {
            buckets
                .entry(bucket(ward, radius))
                .or_insert_with(Vec::new)
                .push(index);
        }

        Self {
            wards,
            radius,
            radius_squared: radius * radius,
            buckets,
        }
    }

    pub(crate) fn neighbors(&self, point_index: usize) -> Vec<usize> {
        let point = &self.wards[point_index];
        let (bucket_x, bucket_y) = bucket(point, self.radius);
        let mut neighbors = Vec::new();

        for x_offset in -1..=1 {
            for y_offset in -1..=1 {
                let Some(candidates) = self
                    .buckets
                    .get(&(bucket_x + x_offset, bucket_y + y_offset))
                else {
                    continue;
                };

                for &candidate_index in candidates {
                    let candidate = &self.wards[candidate_index];
                    let delta_x = point.x_pos - candidate.x_pos;
                    let delta_y = point.y_pos - candidate.y_pos;

                    if delta_x * delta_x + delta_y * delta_y <= self.radius_squared {
                        neighbors.push(candidate_index);
                    }
                }
            }
        }

        neighbors.sort_unstable_by(|left, right| {
            self.wards[*left]
                .id
                .total_cmp(&self.wards[*right].id)
                .then_with(|| left.cmp(right))
        });
        neighbors
    }
}

fn bucket(ward: &Ward, radius: f64) -> (i64, i64) {
    (
        (ward.x_pos / radius).floor() as i64,
        (ward.y_pos / radius).floor() as i64,
    )
}
