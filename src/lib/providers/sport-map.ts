import type { Sport } from "@/lib/domain/types";

export const sportFromOddsApiKey = (sportKey: string): Sport | null => {
  if (sportKey.startsWith("soccer_")) return "football";
  if (sportKey.startsWith("basketball_")) return "basketball";
  if (sportKey.startsWith("tennis_")) return "tennis";
  if (sportKey.startsWith("icehockey_")) return "hockey";
  if (sportKey.startsWith("baseball_")) return "baseball";
  if (sportKey.startsWith("mma_")) return "mma";
  if (sportKey.startsWith("esports_")) return "esports";
  return null;
};
