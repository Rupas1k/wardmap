mod boruvka;
mod prim;
mod union_find;

pub(crate) use boruvka::build_boruvka;
pub(crate) use prim::build as build_prim;
pub(crate) use union_find::UnionFind;

#[derive(Debug, Clone, Copy)]
pub(crate) struct MstEdge {
    pub(crate) source: usize,
    pub(crate) target: usize,
    pub(crate) weight: f64,
}

pub(crate) const PRIM_POINT_LIMIT: usize = 500;
