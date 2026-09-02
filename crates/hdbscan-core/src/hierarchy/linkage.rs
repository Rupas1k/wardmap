use super::SingleLinkageMerge;
use crate::mst::{MstEdge, UnionFind};

pub(crate) fn mst_to_single_linkage(
    edges: &[MstEdge],
    point_count: usize,
) -> Vec<SingleLinkageMerge> {
    if edges.is_empty() {
        return vec![];
    }

    let mut sorted_edges: Vec<MstEdge> = edges.to_vec();
    sorted_edges.sort_unstable_by(|ea, eb| {
        ea.weight
            .total_cmp(&eb.weight)
            .then_with(|| ea.source.min(ea.target).cmp(&eb.source.min(eb.target)))
            .then_with(|| ea.source.max(ea.target).cmp(&eb.source.max(eb.target)))
    });

    let mut union_find = UnionFind::new(point_count);
    let mut merges = Vec::with_capacity(edges.len());

    let mut i = 0;
    while i < sorted_edges.len() {
        let current_weight = sorted_edges[i].weight;
        let batch_start = i;

        while i < sorted_edges.len() && sorted_edges[i].weight == current_weight {
            i += 1;
        }

        for edge in &sorted_edges[batch_start..i] {
            let source_root = union_find.find(edge.source);
            let target_root = union_find.find(edge.target);

            if source_root != target_root {
                let (left, right) = if source_root < target_root {
                    (source_root, target_root)
                } else {
                    (target_root, source_root)
                };
                union_find.union(source_root, target_root);
                merges.push(SingleLinkageMerge {
                    left,
                    right,
                    distance: edge.weight,
                });
            }
        }
    }

    merges
}
