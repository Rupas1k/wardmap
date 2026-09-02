use super::UnionFind;
use crate::mst::MstEdge;
use crate::neighbors::KdTree;
use ndarray::ArrayView1;

#[derive(Clone, Copy)]
struct BestEdge {
    distance_squared: f64,
    source: usize,
    target: usize,
}

struct BoruvkaState {
    union_find: UnionFind,
    best_edges: Vec<BestEdge>,
    edges: Vec<MstEdge>,
    component_count: usize,
}

impl BoruvkaState {
    fn new(point_count: usize) -> Self {
        Self {
            union_find: UnionFind::new(point_count),
            best_edges: vec![
                BestEdge {
                    distance_squared: f64::INFINITY,
                    source: 0,
                    target: 0,
                };
                point_count
            ],
            edges: Vec::with_capacity(point_count - 1),
            component_count: point_count,
        }
    }

    fn merge(&mut self, candidates: &mut [(f64, usize, usize)]) -> bool {
        candidates.sort_by(|left, right| {
            left.0
                .total_cmp(&right.0)
                .then_with(|| left.1.cmp(&right.1))
                .then_with(|| left.2.cmp(&right.2))
        });

        let mut merged = false;

        for &(distance_squared, source, target) in candidates.iter() {
            let source_component = self.union_find.find(source);
            let target_component = self.union_find.find(target);

            if source_component == target_component {
                continue;
            }

            self.edges.push(MstEdge {
                source,
                target,
                weight: distance_squared.sqrt(),
            });
            self.union_find.union(source, target);
            self.component_count -= 1;
            merged = true;
        }

        merged
    }
}

fn reachability_squared(core_left: f64, core_right: f64, distance_squared: f64) -> f64 {
    core_left.max(core_right).max(distance_squared)
}

pub(crate) fn build_boruvka(
    tree: &KdTree,
    core_distances: &ArrayView1<f64>,
    neighbor_indices: &[usize],
    neighbors_per_point: usize,
) -> Vec<MstEdge> {
    let point_count = tree.point_count();
    if point_count <= 1 {
        return vec![];
    }

    let core_values = core_distances
        .as_slice()
        .expect("core distances contiguous");

    let core_squared: Vec<f64> = core_values.iter().map(|&d| d * d).collect();

    let mut state = BoruvkaState::new(point_count);

    seed_best_edges(
        &mut state,
        tree,
        &core_squared,
        neighbor_indices,
        neighbors_per_point,
    );
    merge_seed_edges(&mut state, point_count);

    let mut node_min_core = vec![f64::INFINITY; tree.nodes().len()];
    minimum_core_distances(tree, 0, core_values, &mut node_min_core);

    let node_min_core_sq: Vec<f64> = node_min_core.iter().map(|&d| d * d).collect();

    let mut node_component = vec![usize::MAX; tree.nodes().len()];

    let mut point_component = vec![0; point_count];

    let mut merge_edges: Vec<(f64, usize, usize)> = Vec::new();
    while state.component_count > 1 {
        for (point, component) in point_component.iter_mut().enumerate() {
            *component = state.union_find.find(point);
        }

        for point in 0..point_count {
            if point_component[point] != point {
                let component = point_component[point];

                if state.best_edges[point].distance_squared
                    < state.best_edges[component].distance_squared
                {
                    let best = state.best_edges[point];
                    let source_component = point_component[best.source];
                    let target_component = point_component[best.target];

                    if source_component != target_component {
                        state.best_edges[component] = best;
                    }
                }

                continue;
            }

            let best = &state.best_edges[point];
            if best.distance_squared < f64::INFINITY {
                let source_component = point_component[best.source];
                let target_component = point_component[best.target];

                if source_component == target_component {
                    state.best_edges[point].distance_squared = f64::INFINITY;
                }
            }
        }

        update_node_components(tree, 0, &point_component, &mut node_component);

        if !tree.nodes().is_empty() {
            TreePairSearch {
                tree,
                core_squared: &core_squared,
                node_min_core_squared: &node_min_core_sq,
                point_component: &point_component,
                best_edges: &mut state.best_edges,
                node_component: &node_component,
            }
            .search(0, 0);
        }

        merge_edges.clear();

        for point in 0..point_count {
            if state.union_find.find(point) != point {
                continue;
            }

            let best = &state.best_edges[point];
            if best.distance_squared < f64::INFINITY {
                merge_edges.push((best.distance_squared, best.source, best.target));
            }
        }

        if !state.merge(&mut merge_edges) {
            break;
        }
    }

    state.edges
}

fn seed_best_edges(
    state: &mut BoruvkaState,
    tree: &KdTree,
    core_squared: &[f64],
    neighbor_indices: &[usize],
    neighbors_per_point: usize,
) {
    for source in 0..tree.point_count() {
        let start = source * neighbors_per_point;
        let end = start + neighbors_per_point;

        for &target in &neighbor_indices[start..end] {
            if target == source || target >= tree.point_count() {
                continue;
            }

            let distance_squared = tree.point_distance_squared(source, target);
            let reachability_squared =
                reachability_squared(core_squared[source], core_squared[target], distance_squared);

            update_best_edge(&mut state.best_edges, source, target, reachability_squared);
            update_best_edge(&mut state.best_edges, target, source, reachability_squared);
        }
    }
}

fn update_best_edge(
    best_edges: &mut [BestEdge],
    source: usize,
    target: usize,
    distance_squared: f64,
) {
    if distance_squared < best_edges[source].distance_squared {
        best_edges[source] = BestEdge {
            distance_squared,
            source,
            target,
        };
    }
}

fn merge_seed_edges(state: &mut BoruvkaState, point_count: usize) {
    loop {
        let mut candidates = Vec::new();

        for point in 0..point_count {
            if state.union_find.find(point) != point {
                continue;
            }

            let best = state.best_edges[point];
            if best.distance_squared == f64::INFINITY {
                continue;
            }

            let source_component = state.union_find.find(best.source);
            let target_component = state.union_find.find(best.target);

            if source_component != target_component {
                candidates.push((best.distance_squared, best.source, best.target));
            }
        }

        if candidates.is_empty() || !state.merge(&mut candidates) {
            break;
        }

        refresh_best_edges(state, point_count);
    }
}

fn refresh_best_edges(state: &mut BoruvkaState, point_count: usize) {
    for point in 0..point_count {
        let component = state.union_find.find(point);

        if component != point {
            let best = state.best_edges[point];
            let source_component = state.union_find.find(best.source);
            let target_component = state.union_find.find(best.target);

            if best.distance_squared < state.best_edges[component].distance_squared
                && source_component != target_component
            {
                state.best_edges[component] = best;
            }

            continue;
        }

        let best = state.best_edges[point];
        if best.distance_squared < f64::INFINITY
            && state.union_find.find(best.source) == state.union_find.find(best.target)
        {
            state.best_edges[point].distance_squared = f64::INFINITY;
        }
    }
}

fn minimum_core_distances(
    tree: &KdTree,
    node_index: usize,
    core_values: &[f64],
    node_min_core: &mut [f64],
) {
    let nodes = tree.nodes();
    if node_index >= nodes.len() {
        return;
    }

    let node = &nodes[node_index];

    if node.is_leaf {
        let mut min_core = f64::INFINITY;
        let sorted = tree.point_indices();
        for &idx in &sorted[node.start..node.end] {
            if core_values[idx] < min_core {
                min_core = core_values[idx];
            }
        }
        node_min_core[node_index] = min_core;
    } else {
        let mut min_core = f64::INFINITY;
        let left = node.left;
        let right = node.right;
        if left < nodes.len() {
            minimum_core_distances(tree, left, core_values, node_min_core);
            min_core = f64::min(min_core, node_min_core[left]);
        }
        if right < nodes.len() {
            minimum_core_distances(tree, right, core_values, node_min_core);
            min_core = f64::min(min_core, node_min_core[right]);
        }
        node_min_core[node_index] = min_core;
    }
}

fn update_node_components(
    tree: &KdTree,
    node_index: usize,
    point_component: &[usize],
    node_component: &mut [usize],
) -> usize {
    let nodes = tree.nodes();
    if node_index >= nodes.len() {
        return usize::MAX;
    }

    let node = &nodes[node_index];
    let sorted = tree.point_indices();

    if node.is_leaf {
        let first = point_component[sorted[node.start]];
        let all_same = sorted[node.start..node.end]
            .iter()
            .all(|&idx| point_component[idx] == first);
        let comp = if all_same { first } else { usize::MAX };
        node_component[node_index] = comp;
        comp
    } else {
        let left = node.left;
        let right = node.right;
        let left_comp = if left < nodes.len() {
            update_node_components(tree, left, point_component, node_component)
        } else {
            usize::MAX
        };
        let comp = if left_comp == usize::MAX {
            if right < nodes.len() {
                update_node_components(tree, right, point_component, node_component);
            }
            usize::MAX
        } else {
            let right_comp = if right < nodes.len() {
                update_node_components(tree, right, point_component, node_component)
            } else {
                usize::MAX
            };
            if left_comp == right_comp {
                left_comp
            } else {
                usize::MAX
            }
        };
        node_component[node_index] = comp;
        comp
    }
}

struct TreePairSearch<'a> {
    tree: &'a KdTree,
    core_squared: &'a [f64],
    node_min_core_squared: &'a [f64],
    point_component: &'a [usize],
    best_edges: &'a mut [BestEdge],
    node_component: &'a [usize],
}

impl TreePairSearch<'_> {
    fn search(&mut self, query_node: usize, ref_node: usize) {
        let nodes = self.tree.nodes();
        if query_node >= nodes.len() || ref_node >= nodes.len() {
            return;
        }

        let q_comp = self.node_component[query_node];
        let r_comp = self.node_component[ref_node];
        if q_comp != usize::MAX && q_comp == r_comp {
            return;
        }

        let minimum_distance_squared = self
            .tree
            .minimum_node_distance_squared(query_node, ref_node);
        let maximum_core_lower_bound = f64::max(
            self.node_min_core_squared[query_node],
            self.node_min_core_squared[ref_node],
        );
        let reachability_lower_bound = f64::max(maximum_core_lower_bound, minimum_distance_squared);

        let q_node = &nodes[query_node];
        let sorted = self.tree.point_indices();
        let mut can_prune = true;
        for &idx in &sorted[q_node.start..q_node.end] {
            let comp = self.point_component[idx];
            if reachability_lower_bound < self.best_edges[comp].distance_squared {
                can_prune = false;
                break;
            }
        }
        if can_prune {
            return;
        }

        let r_node = &nodes[ref_node];

        if q_node.is_leaf && r_node.is_leaf {
            let dimensions = self.tree.dimensions();

            let ordered_points = self.tree.ordered_points();

            for query_position in q_node.start..q_node.end {
                let query_point = sorted[query_position];
                let query_component = self.point_component[query_point];
                let query_core_squared = self.core_squared[query_point];
                let mut best_query_squared = self.best_edges[query_component].distance_squared;

                if query_core_squared >= best_query_squared {
                    continue;
                }

                for (reference_position, &reference_point) in sorted
                    .iter()
                    .enumerate()
                    .take(r_node.end)
                    .skip(r_node.start)
                {
                    let reference_component = self.point_component[reference_point];
                    if query_component == reference_component {
                        continue;
                    }

                    let maximum_core_squared =
                        query_core_squared.max(self.core_squared[reference_point]);
                    let best_reference_squared =
                        self.best_edges[reference_component].distance_squared;
                    if maximum_core_squared >= best_query_squared
                        && maximum_core_squared >= best_reference_squared
                    {
                        continue;
                    }

                    let distance_squared = crate::neighbors::euclidean::squared_euclidean_at(
                        ordered_points,
                        query_position,
                        reference_position,
                        dimensions,
                    );
                    let reachability_squared = reachability_squared(
                        query_core_squared,
                        self.core_squared[reference_point],
                        distance_squared,
                    );

                    if reachability_squared < self.best_edges[query_component].distance_squared {
                        self.best_edges[query_component] = BestEdge {
                            distance_squared: reachability_squared,
                            source: query_point,
                            target: reference_point,
                        };
                        best_query_squared = reachability_squared;
                    }
                    if reachability_squared < self.best_edges[reference_component].distance_squared
                    {
                        self.best_edges[reference_component] = BestEdge {
                            distance_squared: reachability_squared,
                            source: reference_point,
                            target: query_point,
                        };
                    }
                }
            }
            return;
        }

        if q_node.is_leaf || (!r_node.is_leaf && r_node.count > q_node.count) {
            let (first, second) = closer_child_first(self.tree, query_node, ref_node);

            if first < nodes.len() {
                self.search(query_node, first);
            }
            if second < nodes.len() {
                self.search(query_node, second);
            }
        } else {
            let q_left = q_node.left;
            let q_right = q_node.right;
            if q_left < nodes.len() {
                self.search(q_left, ref_node);
            }
            if q_right < nodes.len() {
                self.search(q_right, ref_node);
            }
        }
    }
}

fn closer_child_first(tree: &KdTree, query_node: usize, ref_node: usize) -> (usize, usize) {
    let r = &tree.nodes()[ref_node];
    let r_left = r.left;
    let r_right = r.right;
    let nodes = tree.nodes();

    let dist_left = if r_left < nodes.len() {
        tree.minimum_node_distance_squared(query_node, r_left)
    } else {
        f64::INFINITY
    };
    let dist_right = if r_right < nodes.len() {
        tree.minimum_node_distance_squared(query_node, r_right)
    } else {
        f64::INFINITY
    };

    if dist_left <= dist_right {
        (r_left, r_right)
    } else {
        (r_right, r_left)
    }
}
