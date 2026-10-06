export interface DependencyNode {
  id: string;
  type: "event" | "state" | "player" | "metric" | "market";
}

export interface DependencyEdge {
  from: string;
  to: string;
  strength: number;
  direction: 1 | -1;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export const estimateCorrelationRisk = (
  graph: DependencyGraph,
  selectedMarketIds: string[],
): number => {
  if (selectedMarketIds.length < 2) return 0;

  const selected = new Set(selectedMarketIds);
  const relevant = graph.edges.filter(
    (edge) => selected.has(edge.from) && selected.has(edge.to),
  );

  if (relevant.length === 0) return 0;

  const meanStrength =
    relevant.reduce((sum, edge) => sum + Math.abs(edge.strength), 0) /
    relevant.length;

  return Math.min(1, meanStrength);
};
