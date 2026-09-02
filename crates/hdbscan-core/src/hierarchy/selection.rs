use super::CondensedTreeEdge;
use crate::params::ClusterSelectionMethod;
use std::collections::HashSet;

pub(crate) fn select_clusters(
    condensed_tree: &[CondensedTreeEdge],
    point_count: usize,
    method: ClusterSelectionMethod,
    epsilon: f64,
) -> HashSet<usize> {
    if condensed_tree.is_empty() {
        return HashSet::new();
    }

    let node_count = condensed_tree
        .iter()
        .map(|edge| edge.parent.max(edge.child))
        .max()
        .unwrap_or(0)
        + 1;
    let root = condensed_tree
        .iter()
        .map(|edge| edge.parent)
        .min()
        .unwrap_or(point_count);
    let mut is_cluster = vec![false; node_count];
    let mut children = vec![Vec::new(); node_count];
    let mut parent = vec![usize::MAX; node_count];
    let mut birth_lambda = vec![f64::NAN; node_count];

    for edge in condensed_tree {
        is_cluster[edge.parent] = true;

        if edge.child >= point_count {
            is_cluster[edge.child] = true;
            children[edge.parent].push(edge.child);
            parent[edge.child] = edge.parent;

            if birth_lambda[edge.child].is_nan() || edge.lambda < birth_lambda[edge.child] {
                birth_lambda[edge.child] = edge.lambda;
            }
        }
    }

    birth_lambda[root] = 0.0;

    let selected = match method {
        ClusterSelectionMethod::Eom => {
            select_eom(condensed_tree, root, &is_cluster, &children, &birth_lambda)
        }
        ClusterSelectionMethod::Leaf => is_cluster
            .iter()
            .enumerate()
            .filter_map(|(cluster, &exists)| {
                (exists && children[cluster].is_empty()).then_some(cluster)
            })
            .collect(),
    };

    if epsilon > 0.0 {
        merge_by_epsilon(selected, root, &children, &parent, &birth_lambda, epsilon)
    } else {
        selected
    }
}

fn select_eom(
    condensed_tree: &[CondensedTreeEdge],
    root: usize,
    is_cluster: &[bool],
    children: &[Vec<usize>],
    birth_lambda: &[f64],
) -> HashSet<usize> {
    let mut stability = vec![0.0; is_cluster.len()];

    for edge in condensed_tree {
        stability[edge.parent] +=
            (edge.lambda - birth_lambda[edge.parent]) * edge.child_size as f64;
    }

    let mut selected = is_cluster.to_vec();
    selected[root] = false;

    for cluster in (root + 1..is_cluster.len()).rev() {
        if !is_cluster[cluster] || children[cluster].is_empty() {
            continue;
        }

        let child_stability = children[cluster]
            .iter()
            .map(|&child| stability[child])
            .sum::<f64>();

        if child_stability > stability[cluster] {
            selected[cluster] = false;
            stability[cluster] = child_stability;
        } else {
            deselect_descendants(cluster, children, &mut selected);
        }
    }

    selected
        .into_iter()
        .enumerate()
        .filter_map(|(cluster, selected)| selected.then_some(cluster))
        .collect()
}

fn merge_by_epsilon(
    selected: HashSet<usize>,
    root: usize,
    children: &[Vec<usize>],
    parent: &[usize],
    birth_lambda: &[f64],
    epsilon: f64,
) -> HashSet<usize> {
    let mut merged = HashSet::new();
    let mut processed = vec![false; children.len()];

    for &cluster in &selected {
        if processed[cluster] {
            continue;
        }

        let lambda = birth_lambda[cluster];
        if lambda.is_nan() || 1.0 / lambda >= epsilon {
            merged.insert(cluster);
            continue;
        }

        let ancestor = epsilon_ancestor(cluster, root, parent, birth_lambda, epsilon);
        merged.insert(ancestor);
        mark_descendants(ancestor, children, &mut processed);
    }

    merged
}

fn epsilon_ancestor(
    mut cluster: usize,
    root: usize,
    parent: &[usize],
    birth_lambda: &[f64],
    epsilon: f64,
) -> usize {
    loop {
        let next = parent[cluster];
        if next == usize::MAX || next == root || birth_lambda[next].is_nan() {
            return cluster;
        }

        if 1.0 / birth_lambda[next] > epsilon {
            return next;
        }

        cluster = next;
    }
}

fn deselect_descendants(cluster: usize, children: &[Vec<usize>], selected: &mut [bool]) {
    let mut pending = children[cluster].clone();

    while let Some(child) = pending.pop() {
        selected[child] = false;
        pending.extend(children[child].iter().copied());
    }
}

fn mark_descendants(cluster: usize, children: &[Vec<usize>], processed: &mut [bool]) {
    let mut pending = children[cluster].clone();

    while let Some(child) = pending.pop() {
        processed[child] = true;
        pending.extend(children[child].iter().copied());
    }
}
