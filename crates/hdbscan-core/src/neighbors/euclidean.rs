#[inline(always)]
pub(crate) fn squared_euclidean(left: &[f64], right: &[f64]) -> f64 {
    debug_assert_eq!(left.len(), right.len());
    left.iter()
        .zip(right)
        .map(|(left, right)| {
            let difference = left - right;
            difference * difference
        })
        .sum()
}

#[inline(always)]
pub(crate) fn squared_euclidean_at(
    data: &[f64],
    left: usize,
    right: usize,
    dimensions: usize,
) -> f64 {
    let left_offset = left * dimensions;
    let right_offset = right * dimensions;
    squared_euclidean(
        &data[left_offset..left_offset + dimensions],
        &data[right_offset..right_offset + dimensions],
    )
}
