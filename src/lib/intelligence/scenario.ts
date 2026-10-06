export interface ScenarioBranch {
  id: string;
  label: string;
  probability: number;
  horizonSeconds: number;
  marketImpacts: Array<{
    marketId: string;
    selectionId: string;
    probabilityBefore: number;
    probabilityAfter: number;
  }>;
}

export interface ScenarioTree {
  eventId: string;
  generatedAt: string;
  branches: ScenarioBranch[];
}

export const normalizeScenarioProbabilities = (branches: ScenarioBranch[]) => {
  const total = branches.reduce((sum, branch) => sum + branch.probability, 0);
  if (total <= 0) return branches;

  return branches.map((branch) => ({
    ...branch,
    probability: branch.probability / total,
  }));
};

export const rankScenarioSensitivity = (tree: ScenarioTree) =>
  tree.branches
    .flatMap((branch) =>
      branch.marketImpacts.map((impact) => ({
        branchId: branch.id,
        branchLabel: branch.label,
        marketId: impact.marketId,
        selectionId: impact.selectionId,
        absoluteShift: Math.abs(impact.probabilityAfter - impact.probabilityBefore),
      })),
    )
    .sort((a, b) => b.absoluteShift - a.absoluteShift);
