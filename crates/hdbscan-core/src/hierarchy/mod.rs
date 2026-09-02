mod condensed_tree;
mod labels;
mod linkage;
mod selection;

pub(crate) use condensed_tree::build_condensed_tree as condense;
pub(crate) use labels::assign_labels;
pub(crate) use linkage::mst_to_single_linkage as build_linkage;
pub(crate) use selection::select_clusters;

#[derive(Debug, Clone, Copy)]
pub(crate) struct SingleLinkageMerge {
    pub(crate) left: usize,
    pub(crate) right: usize,
    pub(crate) distance: f64,
}

#[derive(Debug, Clone, Copy)]
pub(crate) struct CondensedTreeEdge {
    pub(crate) parent: usize,
    pub(crate) child: usize,
    pub(crate) lambda: f64,
    pub(crate) child_size: usize,
}
