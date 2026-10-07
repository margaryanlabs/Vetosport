"use client";

import type { Sport } from "@/lib/domain/types";
import { SportGlyph } from "@/components/SportGlyph";
import type { WorkspaceView } from "@/components/ArenaNavigator";

export function SportAtmosphere({
  sport,
  mode,
}: {
  sport: Sport;
  mode: WorkspaceView;
}) {
  return (
    <div
      aria-hidden
      className={`sportFx sportFx-${sport} sportFx-${mode}`}
    >
      <span className="sportFxField" />
      <span className="sportFxOrbit sportFxOrbitOne" />
      <span className="sportFxOrbit sportFxOrbitTwo" />
      <span className="sportFxBall">
        <SportGlyph sport={sport} size={24} />
      </span>
      <span className="sportFxSpark sportFxSparkOne" />
      <span className="sportFxSpark sportFxSparkTwo" />
      <span className="sportFxSpark sportFxSparkThree" />
    </div>
  );
}
