const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const canonicalEventKey = (input: {
  sport: string;
  competition?: string;
  startsAt: string;
  home?: string;
  away?: string;
  participants?: string[];
}) => {
  const participantKey =
    input.participants && input.participants.length > 0
      ? input.participants.map(normalize).sort().join("--")
      : [input.home, input.away].filter(Boolean).map((x) => normalize(x!)).join("--");

  return [
    normalize(input.sport),
    normalize(input.competition ?? "unknown"),
    new Date(input.startsAt).toISOString(),
    participantKey || "unknown-participants",
  ].join("::");
};

export const canonicalMarketKey = (input: {
  sport: string;
  family: string;
  market?: string;
  period?: string;
}) =>
  [input.sport, input.family, input.market, input.period]
    .filter(Boolean)
    .map((x) => normalize(x!))
    .join(".");

export const canonicalSelectionKey = (input: {
  label: string;
  line?: number | null;
  participant?: string | null;
}) =>
  [
    normalize(input.label),
    input.participant ? normalize(input.participant) : null,
    input.line == null ? null : input.line.toString(),
  ]
    .filter(Boolean)
    .join(":");
