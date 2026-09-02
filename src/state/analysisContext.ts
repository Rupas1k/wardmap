export type AnalysisScope = { kind: "player" | "match"; id: number };
export type ContextStatus = "idle" | "clustering" | "ready" | "error";

export interface AnalysisContext {
  origin: AnalysisScope | null;
  refinement: AnalysisScope | null;
  status: ContextStatus;
}

export const emptyAnalysisContext: AnalysisContext = {
  origin: null,
  refinement: null,
  status: "idle",
};

export function sameScope(left: AnalysisScope | null, right: AnalysisScope): boolean {
  return left?.kind === right.kind && left.id === right.id;
}

export function scopeKey(scope: AnalysisScope): string {
  return `${scope.kind}:${scope.id}`;
}

export function contextIds(context: AnalysisContext): {
  playerId: number | null;
  matchId: number | null;
} {
  const scopes = [context.origin, context.refinement];
  const player = scopes.find((scope) => scope?.kind === "player");
  const match = scopes.find((scope) => scope?.kind === "match");

  return {
    playerId: player?.id ?? null,
    matchId: match?.id ?? null,
  };
}
