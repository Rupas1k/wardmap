use super::MISSING_NODE;
use ndarray::ArrayView2;

const LEAF_CAPACITY: usize = 10;

#[derive(Clone, Copy)]
pub(crate) struct KdNode {
    pub(crate) split_dimension: usize,
    pub(crate) split_value: f64,
    pub(crate) left: usize,
    pub(crate) right: usize,
    pub(crate) count: usize,
    pub(crate) start: usize,
    pub(crate) end: usize,
    pub(crate) is_leaf: bool,
}

pub(crate) struct KdTree {
    nodes: Vec<KdNode>,
    lower_bounds: Vec<f64>,
    upper_bounds: Vec<f64>,
    data: Vec<f64>,
    ordered_points: Vec<f64>,
    dimensions: usize,
    point_count: usize,
    point_indices: Vec<usize>,
}

struct KdTreeBuilder<'a> {
    data: &'a [f64],
    dimensions: usize,
    nodes: Vec<KdNode>,
    lower_bounds: Vec<f64>,
    upper_bounds: Vec<f64>,
}

impl KdTree {
    pub(crate) fn build(data: &ArrayView2<f64>) -> Self {
        let point_count = data.nrows();
        let dimensions = data.ncols();

        let contiguous_data = data.as_standard_layout();
        let flat_data: Vec<f64> = contiguous_data.as_slice().unwrap().to_vec();

        let mut indices: Vec<usize> = (0..point_count).collect();
        let max_nodes = 2 * point_count / LEAF_CAPACITY + 1;
        let mut builder = KdTreeBuilder::new(&flat_data, dimensions, max_nodes);

        if point_count > 0 {
            builder.build_node(&mut indices, 0, point_count);
        }

        let mut ordered_points = vec![0.0; point_count * dimensions];
        for (position, &original_index) in indices.iter().enumerate() {
            let source = original_index * dimensions;
            let target = position * dimensions;

            ordered_points[target..target + dimensions]
                .copy_from_slice(&flat_data[source..source + dimensions]);
        }

        let KdTreeBuilder {
            nodes,
            lower_bounds,
            upper_bounds,
            ..
        } = builder;

        Self {
            nodes,
            lower_bounds,
            upper_bounds,
            data: flat_data,
            ordered_points,
            dimensions,
            point_count,
            point_indices: indices,
        }
    }

    pub(crate) fn nodes(&self) -> &[KdNode] {
        &self.nodes
    }

    pub(crate) fn dimensions(&self) -> usize {
        self.dimensions
    }

    pub(crate) fn point_count(&self) -> usize {
        self.point_count
    }

    pub(crate) fn point_indices(&self) -> &[usize] {
        &self.point_indices
    }

    pub(crate) fn ordered_points(&self) -> &[f64] {
        &self.ordered_points
    }
}

impl KdTreeBuilder<'_> {
    fn new(data: &[f64], dimensions: usize, capacity: usize) -> KdTreeBuilder<'_> {
        KdTreeBuilder {
            data,
            dimensions,
            nodes: Vec::with_capacity(capacity),
            lower_bounds: Vec::with_capacity(capacity * dimensions),
            upper_bounds: Vec::with_capacity(capacity * dimensions),
        }
    }

    fn build_node(&mut self, indices: &mut [usize], start: usize, end: usize) -> usize {
        if start >= end {
            return MISSING_NODE;
        }

        let count = end - start;

        let bounds_start = self.lower_bounds.len();
        self.lower_bounds
            .extend(std::iter::repeat_n(f64::INFINITY, self.dimensions));
        self.upper_bounds
            .extend(std::iter::repeat_n(f64::NEG_INFINITY, self.dimensions));

        let lower_bound = &mut self.lower_bounds[bounds_start..bounds_start + self.dimensions];
        let upper_bound = &mut self.upper_bounds[bounds_start..bounds_start + self.dimensions];

        for &point in &indices[start..end] {
            let offset = point * self.dimensions;

            for dimension in 0..self.dimensions {
                let value = self.data[offset + dimension];

                if value < lower_bound[dimension] {
                    lower_bound[dimension] = value;
                }
                if value > upper_bound[dimension] {
                    upper_bound[dimension] = value;
                }
            }
        }

        if count <= LEAF_CAPACITY {
            let node_index = self.nodes.len();
            debug_assert_eq!(node_index * self.dimensions, bounds_start);
            self.nodes.push(KdNode {
                split_dimension: 0,
                split_value: 0.0,
                left: MISSING_NODE,
                right: MISSING_NODE,
                count,
                start,
                end,
                is_leaf: true,
            });
            return node_index;
        }

        let mut split_dimension = 0;
        let mut best_spread = f64::NEG_INFINITY;

        for dimension in 0..self.dimensions {
            let spread = upper_bound[dimension] - lower_bound[dimension];

            if spread > best_spread {
                best_spread = spread;
                split_dimension = dimension;
            }
        }

        let midpoint = start + count / 2;
        indices[start..end].select_nth_unstable_by(midpoint - start, |&left, &right| {
            let left_value = self.data[left * self.dimensions + split_dimension];
            let right_value = self.data[right * self.dimensions + split_dimension];

            left_value.total_cmp(&right_value)
        });

        let split_value = self.data[indices[midpoint] * self.dimensions + split_dimension];

        let node_index = self.nodes.len();
        debug_assert_eq!(node_index * self.dimensions, bounds_start);
        self.nodes.push(KdNode {
            split_dimension,
            split_value,
            left: MISSING_NODE,
            right: MISSING_NODE,
            count,
            start,
            end,
            is_leaf: false,
        });

        let left = self.build_node(indices, start, midpoint);
        let right = self.build_node(indices, midpoint, end);

        self.nodes[node_index].left = left;
        self.nodes[node_index].right = right;

        node_index
    }
}

impl KdTree {
    #[inline]
    pub(crate) fn minimum_node_distance_squared(&self, left: usize, right: usize) -> f64 {
        let left_offset = left * self.dimensions;
        let right_offset = right * self.dimensions;
        let mut distance_squared = 0.0f64;

        for dimension in 0..self.dimensions {
            unsafe {
                let left_minimum = *self.lower_bounds.get_unchecked(left_offset + dimension);
                let left_maximum = *self.upper_bounds.get_unchecked(left_offset + dimension);
                let right_minimum = *self.lower_bounds.get_unchecked(right_offset + dimension);
                let right_maximum = *self.upper_bounds.get_unchecked(right_offset + dimension);
                let gap = f64::max(left_minimum - right_maximum, 0.0)
                    + f64::max(right_minimum - left_maximum, 0.0);

                distance_squared += gap * gap;
            }
        }

        distance_squared
    }

    #[inline]
    pub(crate) fn point_distance_squared(&self, left: usize, right: usize) -> f64 {
        crate::neighbors::euclidean::squared_euclidean_at(&self.data, left, right, self.dimensions)
    }

    #[inline]
    pub(crate) fn search(&self, query: &[f64], heap: &mut crate::neighbors::heap::KnnHeap) {
        if !self.nodes.is_empty() {
            self.search_node(0, query, heap);
        }
    }

    fn search_node(
        &self,
        node_index: usize,
        query: &[f64],
        heap: &mut crate::neighbors::heap::KnnHeap,
    ) {
        let node = &self.nodes[node_index];
        let dim = self.dimensions;

        let mut minimum_distance_squared = 0.0f64;
        let bounds_offset = node_index * dim;
        for d in 0..dim {
            unsafe {
                let q = *query.get_unchecked(d);
                let lo = *self.lower_bounds.get_unchecked(bounds_offset + d);
                let hi = *self.upper_bounds.get_unchecked(bounds_offset + d);
                let gap = f64::max(lo - q, 0.0) + f64::max(q - hi, 0.0);
                minimum_distance_squared += gap * gap;
            }
        }
        if heap.is_full() && minimum_distance_squared >= heap.max_distance_squared() {
            return;
        }

        if node.is_leaf {
            let ordered_points = &self.ordered_points;
            for pos in node.start..node.end {
                let off = pos * dim;
                let point = unsafe { ordered_points.get_unchecked(off..off + dim) };
                let distance_squared = crate::neighbors::euclidean::squared_euclidean(query, point);
                let idx = self.point_indices[pos];
                heap.push(distance_squared, idx);
            }
        } else {
            let split_diff = query[node.split_dimension] - node.split_value;
            let (first, second) = if split_diff <= 0.0 {
                (node.left, node.right)
            } else {
                (node.right, node.left)
            };

            if first != MISSING_NODE {
                self.search_node(first, query, heap);
            }
            if second != MISSING_NODE {
                let plane_dist_sq = split_diff * split_diff;
                if !heap.is_full() || plane_dist_sq < heap.max_distance_squared() {
                    self.search_node(second, query, heap);
                }
            }
        }
    }
}
