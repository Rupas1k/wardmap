use super::{CondensedTreeEdge, SingleLinkageMerge};
use crate::mst::UnionFind;

struct HierarchyNode {
    left_child: usize,
    right_child: usize,
    lambda: f64,
    size: usize,
}

struct CondensedTreeBuilder {
    point_count: usize,
    next_cluster: usize,
    edges: Vec<CondensedTreeEdge>,
    pending: Vec<(usize, usize)>,
}

impl CondensedTreeBuilder {
    fn new(point_count: usize, merge_count: usize) -> Self {
        let root = merge_count - 1;

        Self {
            point_count,
            next_cluster: point_count + 1,
            edges: Vec::new(),
            pending: vec![(root, point_count)],
        }
    }

    fn attach_child(&mut self, child: usize, size: usize, parent: usize, lambda: f64) {
        if child < self.point_count {
            self.edges.push(CondensedTreeEdge {
                parent,
                child,
                lambda,
                child_size: 1,
            });

            return;
        }

        let cluster = self.next_cluster;
        self.next_cluster += 1;

        self.edges.push(CondensedTreeEdge {
            parent,
            child: cluster,
            lambda,
            child_size: size,
        });
        self.pending.push((child - self.point_count, cluster));
    }

    fn continue_cluster(&mut self, child: usize, cluster: usize) {
        if child >= self.point_count {
            self.pending.push((child - self.point_count, cluster));
        }
    }
}

pub(crate) fn build_condensed_tree(
    merges: &[SingleLinkageMerge],
    point_count: usize,
    min_cluster_size: usize,
) -> Vec<CondensedTreeEdge> {
    if merges.is_empty() {
        return vec![];
    }

    let merge_count = merges.len();

    let mut root_to_node: Vec<usize> = (0..point_count).collect();
    let mut union_find = UnionFind::new(point_count);
    let mut hierarchy = Vec::with_capacity(merge_count);

    for (i, merge) in merges.iter().enumerate() {
        let root_left = union_find.find(merge.left);
        let root_right = union_find.find(merge.right);

        let left_node = root_to_node[root_left];
        let right_node = root_to_node[root_right];

        let left_size = node_size(&hierarchy, left_node, point_count);
        let right_size = node_size(&hierarchy, right_node, point_count);

        hierarchy.push(HierarchyNode {
            left_child: left_node,
            right_child: right_node,
            lambda: if merge.distance > 0.0 {
                1.0 / merge.distance
            } else {
                f64::INFINITY
            },
            size: left_size + right_size,
        });

        union_find.union(merge.left, merge.right);
        let new_root = union_find.find(merge.left);
        root_to_node[new_root] = point_count + i;
    }

    let mut condensed = CondensedTreeBuilder::new(point_count, merge_count);

    while let Some((node_index, current_cluster)) = condensed.pending.pop() {
        let parent_lambda = hierarchy[node_index].lambda;
        let left = hierarchy[node_index].left_child;
        let right = hierarchy[node_index].right_child;

        let left_size = node_size(&hierarchy, left, point_count);
        let right_size = node_size(&hierarchy, right, point_count);

        let left_is_cluster = left_size >= min_cluster_size;
        let right_is_cluster = right_size >= min_cluster_size;

        match (left_is_cluster, right_is_cluster) {
            (true, true) => {
                condensed.attach_child(left, left_size, current_cluster, parent_lambda);
                condensed.attach_child(right, right_size, current_cluster, parent_lambda);
            }
            (true, false) => {
                add_pruned_points(
                    &hierarchy,
                    right,
                    point_count,
                    current_cluster,
                    parent_lambda,
                    &mut condensed.edges,
                );
                condensed.continue_cluster(left, current_cluster);
            }
            (false, true) => {
                add_pruned_points(
                    &hierarchy,
                    left,
                    point_count,
                    current_cluster,
                    parent_lambda,
                    &mut condensed.edges,
                );
                condensed.continue_cluster(right, current_cluster);
            }
            (false, false) => {
                add_pruned_points(
                    &hierarchy,
                    left,
                    point_count,
                    current_cluster,
                    parent_lambda,
                    &mut condensed.edges,
                );
                add_pruned_points(
                    &hierarchy,
                    right,
                    point_count,
                    current_cluster,
                    parent_lambda,
                    &mut condensed.edges,
                );
            }
        }
    }

    condensed.edges
}

fn node_size(hierarchy: &[HierarchyNode], node: usize, point_count: usize) -> usize {
    if node < point_count {
        1
    } else {
        hierarchy[node - point_count].size
    }
}

fn add_pruned_points(
    hierarchy: &[HierarchyNode],
    node: usize,
    point_count: usize,
    parent_cluster: usize,
    fallout_lambda: f64,
    edges: &mut Vec<CondensedTreeEdge>,
) {
    let mut stack = vec![(node, fallout_lambda)];

    while let Some((current, lambda)) = stack.pop() {
        if current < point_count {
            edges.push(CondensedTreeEdge {
                parent: parent_cluster,
                child: current,
                lambda,
                child_size: 1,
            });
        } else {
            let h = &hierarchy[current - point_count];
            let child_lambda = f64::max(lambda, h.lambda);
            stack.push((h.right_child, child_lambda));
            stack.push((h.left_child, child_lambda));
        }
    }
}
