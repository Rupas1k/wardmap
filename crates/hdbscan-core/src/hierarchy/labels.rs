use super::CondensedTreeEdge;
use crate::mst::UnionFind;
use std::collections::HashSet;

pub(crate) fn assign_labels(
    condensed_tree: &[CondensedTreeEdge],
    selected_clusters: &HashSet<usize>,
    point_count: usize,
) -> Vec<i32> {
    if selected_clusters.is_empty() {
        return vec![-1; point_count];
    }

    let mut sorted_selected: Vec<usize> = selected_clusters.iter().copied().collect();
    sorted_selected.sort_unstable();

    let root_cluster = condensed_tree.iter().map(|e| e.parent).min().unwrap();

    let max_parent = condensed_tree.iter().map(|e| e.parent).max().unwrap_or(0);
    let max_child = condensed_tree.iter().map(|e| e.child).max().unwrap_or(0);
    let uf_size = max_parent.max(max_child) + 1;

    let mut cluster_to_label = vec![-1i32; uf_size];
    for (i, &c) in sorted_selected.iter().enumerate() {
        cluster_to_label[c] = i as i32;
    }

    let mut union_find = UnionFind::new(uf_size);

    for edge in condensed_tree {
        if !selected_clusters.contains(&edge.child) {
            union_find.union(edge.parent, edge.child);
        }
    }

    let mut labels = vec![-1i32; point_count];

    for (point, label) in labels.iter_mut().enumerate() {
        let cluster = union_find.find(point);
        if cluster != root_cluster {
            let cluster_label = cluster_to_label[cluster];
            if cluster_label >= 0 {
                *label = cluster_label;
            }
        }
    }

    labels
}
