import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("VETO Sport light mode exposes a full semantic surface palette", () => {
  const css = read("src/app/veto-sport-light.css");
  for (const token of ["--vs-bg", "--vs-surface", "--vs-text", "--vs-muted", "--vs-green", "--vs-amber", "--vs-border"]) {
    assert.ok(css.includes(token), "Missing light semantic token: " + token);
  }
  assert.match(css, /data-veto-sport-appearance="light"/);
});

test("Observed chart remains on a dark canvas when light appearance is active", () => {
  const css = read("src/app/veto-sport-light.css");
  assert.match(css, /\.observedChartFrame\s*\{\s*background:\s*#0c1511\s*!important/);
  assert.match(css, /\.observedChartFrame svg/);
  assert.match(css, /\.pitchVision\s*\{\s*background:\s*#0a1513\s*!important/);
  assert.match(css, /\.todayHero \.pitchVision/);
});

test("Sport exposes an accessible theme toggle in the terminal and research headers", () => {
  const layout = read("src/app/layout.tsx");
  const toggle = read("src/components/SportAppearanceToggle.tsx");
  const chrome = read("src/components/WorkspaceChrome.tsx");
  const research = read("src/app/research/watchlist/page.tsx");
  assert.doesNotMatch(layout, /<SportAppearanceToggle\s*\/>/, "No floating duplicates from the root layout");
  assert.match(chrome, /<SportAppearanceToggle\s*\/>/);
  assert.match(research, /<SportAppearanceToggle\s*\/>/);
  assert.match(layout, /veto-sport-light\.css/);
  assert.match(toggle, /aria-pressed/);
  assert.match(toggle, /localStorage\.setItem/);
  assert.match(toggle, /addEventListener\("storage"/);
});

test("Sports research uses light semantic surfaces and leaves the pitch dark", () => {
  const css = read("src/app/research/watchlist/watchlist.css");
  assert.match(css, /data-veto-sport-appearance="light"/);
  assert.match(css, /\.watchHeaderActions/);
  assert.match(css, /\.watchReal \.watchStats article/);
  assert.match(css, /\.watchMatches article/);
  assert.match(css, /\.watchRealHeroVision/);
  const appCss = read("src/app/veto-sport-light.css");
  assert.match(appCss, /\.matchShellTop \.vetoSportAppearanceToggle/);
  assert.doesNotMatch(appCss, /bottom:\s*calc\(78px/);
});

test("Sport light contrast guard runs on both terminal and research routes without touching plotting canvases", () => {
  const guard = read("src/lib/light-contrast-guard.ts");
  const toggle = read("src/components/SportAppearanceToggle.tsx");
  assert.match(toggle, /installLightContrastGuard\("data-veto-sport-appearance"\)/);
  assert.match(guard, /data-veto-sport-appearance/);
  assert.match(guard, /getComputedStyle/);
  assert.match(guard, /contrast\(finalForeground, backdrop\) >= 3/);
  assert.match(guard, /\.pitchVision/);
  assert.match(guard, /\.observedChartFrame/);
  assert.match(guard, /gradientText/);
  assert.match(guard, /pageObserver\.disconnect/);
});

test("light Sport renders paper balances, odds and P&L numerals with explicit foregrounds", () => {
  const css = read("src/app/veto-sport-light.css");
  for (const selector of [
    ".paperTicketMetrics strong", ".paperTicketHistory article b",
    ".paperOutcomeNet.positive", ".paperOutcomeNet.negative",
    ".observedOddsMetrics strong", ".observedOddsRowPrice b",
    ".observedOddsBarTrack", ".observedOddsFilters button.active"
  ]) {
    assert.ok(css.includes(selector), "Missing light value styling: " + selector);
  }
  assert.match(css, /font-variant-numeric:tabular-nums/);
  assert.match(css, /#106f47/);
  assert.match(css, /#b52f40/);
  assert.doesNotMatch(css, /filter:\s*invert\(/i);
});

test("observed sports score, status and model values cannot revert to 6px mobile text", () => {
  const css = read("src/app/observed-room.css");
  assert.match(css, /\.observedRoom :is\(/);
  assert.match(css, /font-size:clamp\(10px/);
  assert.match(css, /\.observedDecisionNumbers strong/);
  assert.match(css, /\.observedMarketTape article>b/);
  assert.match(css, /\.observedScoreCore em \{font-size:10px\}/);
  assert.match(css, /\.observedRoom\s*\{/);
});
