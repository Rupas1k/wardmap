pub(crate) struct KnnHeap {
    items: Vec<(f64, usize)>,
    capacity: usize,
}

impl KnnHeap {
    pub(crate) fn new(capacity: usize) -> Self {
        Self {
            items: Vec::with_capacity(capacity),
            capacity,
        }
    }

    #[inline]
    pub(crate) fn clear(&mut self) {
        self.items.clear();
    }

    #[inline]
    pub(crate) fn push(&mut self, distance_squared: f64, index: usize) {
        if self.items.len() < self.capacity {
            self.items.push((distance_squared, index));
            self.sift_up(self.items.len() - 1);
        } else if distance_squared < self.items[0].0 {
            self.items[0] = (distance_squared, index);
            self.sift_down(0);
        }
    }

    #[inline]
    pub(crate) fn is_full(&self) -> bool {
        self.items.len() >= self.capacity
    }

    #[inline]
    pub(crate) fn max_distance_squared(&self) -> f64 {
        self.items
            .first()
            .map_or(f64::INFINITY, |&(distance, _)| distance)
    }

    #[inline]
    pub(crate) fn all_neighbors(&self, excluded_index: usize, output: &mut [usize]) -> usize {
        let mut count = 0;
        for &(_, index) in &self.items {
            if index != excluded_index && count < output.len() {
                output[count] = index;
                count += 1;
            }
        }
        count
    }

    fn sift_up(&mut self, mut index: usize) {
        while index > 0 {
            let parent = (index - 1) / 2;

            if self.items[index].0 > self.items[parent].0 {
                self.items.swap(index, parent);
                index = parent;
            } else {
                break;
            }
        }
    }

    fn sift_down(&mut self, mut index: usize) {
        let item_count = self.items.len();

        loop {
            let left = 2 * index + 1;
            let right = 2 * index + 2;
            let mut largest = index;

            if left < item_count && self.items[left].0 > self.items[largest].0 {
                largest = left;
            }
            if right < item_count && self.items[right].0 > self.items[largest].0 {
                largest = right;
            }
            if largest != index {
                self.items.swap(index, largest);
                index = largest;
            } else {
                break;
            }
        }
    }
}
