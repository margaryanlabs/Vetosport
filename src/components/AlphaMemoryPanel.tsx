"use client";

import type { Locale } from "@/lib/domain/types";
import { sandboxAlphaMemoryAnalysis } from "@/lib/alpha/sandbox";

const pct = (value: number) => `${(value * 100).toFixed(0)}%`;
const pct2 = (value: number) => `${(value * 100).toFixed(2)}%`;

export function AlphaMemoryPanel({ locale }: { locale: Locale }) {
  const analysis = sandboxAlphaMemoryAnalysis;

  const copy =
    locale === "ru"
      ? {
          title: "ALPHA MEMORY",
          subtitle:
            "Что VETO уже видела раньше · что пережило OOS · что запрещено продвигать",
          warning:
            "СИНТЕТИЧЕСКАЯ ИСТОРИЧЕСКАЯ ПАМЯТЬ · НЕ ДОКАЗАТЕЛЬСТВО ДОХОДНОСТИ",
          memory: "EDGE MEMORY GRAPH",
          hypothesis: "REGISTERED HYPOTHESIS",
          note:
            "Memory Score не является вероятностью выигрыша. SHADOW_CANDIDATE разрешает только теневое наблюдение; production EDGE требует реальной point-in-time истории, executable quotes и отдельного promotion gate.",
        }
      : locale === "hy"
        ? {
            title: "ALPHA MEMORY",
            subtitle:
              "Ինչ է VETO-ն նախկինում տեսել · ինչն է անցել OOS · ինչը չի կարելի առաջ մղել",
            warning:
              "ՍԻՆԹԵՏԻԿ ՊԱՏՄԱԿԱՆ ՀԻՇՈՂՈՒԹՅՈՒՆ · ՈՉ ՇԱՀՈՒԹԱԲԵՐՈՒԹՅԱՆ ԱՊԱՑՈՒՅՑ",
            memory: "EDGE MEMORY GRAPH",
            hypothesis: "REGISTERED HYPOTHESIS",
            note:
              "Memory Score-ը հաղթելու հավանականություն չէ։ SHADOW_CANDIDATE-ը միայն shadow research կարգավիճակ է։",
          }
        : {
            title: "ALPHA MEMORY",
            subtitle:
              "What VETO has seen before · what survived OOS · what is not allowed to promote",
            warning:
              "SYNTHETIC HISTORICAL MEMORY · NOT PROOF OF PROFITABILITY",
            memory: "EDGE MEMORY GRAPH",
            hypothesis: "REGISTERED HYPOTHESIS",
            note:
              "Memory Score is not a win probability. SHADOW_CANDIDATE only permits shadow observation; production EDGE requires real point-in-time history, executable quotes and a separate promotion gate.",
          };

  return (
    <section className="alphaMemorySurface">
      <div className="alphaMemoryHead">
        <div>
          <span className="miniLabel">PARALLAX V</span>
          <div>
            <h3>{copy.title}</h3>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <span>{copy.warning}</span>
      </div>

      <div className="alphaStateFingerprint">
        <div>
          <span>CURRENT STATE FINGERPRINT</span>
          <strong>{analysis.current.marketFamily.toUpperCase()}</strong>
        </div>
        <div className="alphaTags">
          {analysis.current.stateTags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>

      <div className="alphaMemoryMain">
        <section className="alphaMemoryGraph">
          <div className="alphaSubhead">
            <div>
              <span>{copy.memory}</span>
              <strong>Nearest validated state patterns</strong>
            </div>
            <small>TOP {analysis.matches.length}</small>
          </div>

          <div className="alphaMemoryList">
            {analysis.matches.map((match, index) => (
              <article key={match.id}>
                <div className="alphaMemoryRank">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{pct(match.memoryScore)}</strong>
                </div>
                <div className="alphaMemoryIdentity">
                  <strong>{match.marketFamily.toUpperCase()}</strong>
                  <small>{match.id}</small>
                  <div>
                    {match.stateTags.slice(0, 5).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="alphaMemoryMetrics">
                  <span>SIM <b>{pct(match.stateSimilarity)}</b></span>
                  <span>OOS <b>{match.oosWindows}</b></span>
                  <span>CLV <b>{pct2(match.meanNetClv)}</b></span>
                  <span>q <b>{match.fdrQValue.toFixed(3)}</b></span>
                  <span>EXEC <b>{pct(match.executableCoverage)}</b></span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="alphaHypothesis">
          <div className="alphaSubhead">
            <div>
              <span>{copy.hypothesis}</span>
              <strong>{analysis.hypothesis.title}</strong>
            </div>
            <em className={analysis.gate.status.toLowerCase()}>
              {analysis.gate.status}
            </em>
          </div>

          <div className="alphaGateHero">
            <div>
              <span>ALPHA QUALITY</span>
              <strong>{pct(analysis.gate.score)}</strong>
            </div>
            <div>
              <span>SAMPLE</span>
              <strong>{analysis.hypothesis.sampleSize}</strong>
            </div>
            <div>
              <span>OOS WINDOWS</span>
              <strong>{analysis.hypothesis.oosWindows}</strong>
            </div>
            <div>
              <span>MEAN NET CLV</span>
              <strong>{pct2(analysis.hypothesis.meanNetClv)}</strong>
            </div>
            <div>
              <span>FDR q</span>
              <strong>{analysis.hypothesis.fdrQValue.toFixed(3)}</strong>
            </div>
            <div>
              <span>REGIME STABILITY</span>
              <strong>{pct(analysis.hypothesis.regimeStability)}</strong>
            </div>
          </div>

          <div className="alphaGateChecks">
            {analysis.gate.checks.map((check) => (
              <div className={check.passed ? "passed" : "failed"} key={check.id}>
                <i />
                <div>
                  <strong>{check.label}</strong>
                  <small>{check.detail}</small>
                </div>
                <em>{check.hard ? "HARD" : "SOFT"}</em>
                <b>{check.passed ? "PASS" : "FAIL"}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="alphaMemoryMethod">
        <span>METHOD / LIMITS</span>
        <p>{copy.note}</p>
        <code>veto.alpha.memory.v1 · registered discovery</code>
      </div>
    </section>
  );
}
