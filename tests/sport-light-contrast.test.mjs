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

test("Sport has a single accessible, persisted appearance toggle in the shared root layout", () => {
  const layout = read("src/app/layout.tsx");
  const toggle = read("src/components/SportAppearanceToggle.tsx");
  assert.match(layout, /<SportAppearanceToggle\s*\/>/);
  assert.match(layout, /veto-sport-light\.css/);
  assert.match(toggle, /aria-pressed/);
  assert.match(toggle, /localStorage\.setItem/);
  assert.match(toggle, /addEventListener\("storage"/);
});
