/**
 * Light theme contrast safety net for legacy VETO screens.
 *
 * Fix only ACTUALLY rendered text/icons whose computed foreground contrast is
 * almost invisible against the browser's computed background. This is not a
 * theme or a global color inversion. Dark trading charts, field visualizations,
 * evidence stages and marked dark islands are deliberately excluded.
 *
 * Scans after client render and route mutations, and restores original inline
 * values when returning to dark mode. It is intentionally conservative:
 * a score below 3:1 is repaired, not every muted secondary label.
 */
type Rgba = [number, number, number, number];
const TEXT_SELECTOR =
  "h1,h2,h3,h4,h5,h6,p,span,a,button,label,small,strong,b,em,li,summary,td,th";
const EXCLUSIONS =
  "svg,canvas,[data-veto-contrast-optout],[data-chart-theme='dark']," +
  ".recharts-wrapper,.tv-lightweight-charts,.lightweight-charts," +
  ".veto-market-pulse--theatre,.veto-theatre,.candlestick-chart," +
  ".pitchVision,.observedChartFrame,[aria-hidden='true']";

function rgb(css: string): Rgba | null {
  const s = css.trim().toLowerCase();
  if (s === "transparent" || s === "none") return null;
  const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (hex) {
    let h = hex[1] ?? "";
    if (h.length === 3 || h.length === 4) h = [...h].map(x => x + x).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    return [
      parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    ];
  }
  const match = /^rgba?\(([^)]+)\)$/.exec(s);
  if (!match) return null;
  const pieces = (match[1] ?? "").replace("/", ",").split(/[\s,]+/).filter(Boolean);
  if (pieces.length < 3) return null;
  const values = pieces.slice(0, 3).map(Number);
  if (values.some(v => !Number.isFinite(v))) return null;
  const alpha = pieces[3] === undefined ? 1 : Number(pieces[3]);
  if (!Number.isFinite(alpha)) return null;
  return [
    Math.max(0, Math.min(255, values[0]!)),
    Math.max(0, Math.min(255, values[1]!)),
    Math.max(0, Math.min(255, values[2]!)),
    Math.max(0, Math.min(1, alpha)),
  ];
}

function blend(over: Rgba, under: Rgba): Rgba {
  const a = over[3];
  return [
    over[0] * a + under[0] * (1 - a),
    over[1] * a + under[1] * (1 - a),
    over[2] * a + under[2] * (1 - a),
    1,
  ];
}

function gradientColor(value: string): Rgba | null {
  if (value === "none" || !value.includes("gradient(")) return null;
  const tokens = value.match(/rgba?\([^)]+\)|#[\da-fA-F]{3,8}\b/g) ?? [];
  const parsed = tokens.map(rgb).filter((x): x is Rgba => x !== null && x[3] > 0);
  if (!parsed.length) return null;
  const first = parsed[0]!;
  const last = parsed[parsed.length - 1]!;
  return [
    (first[0] + last[0]) / 2, (first[1] + last[1]) / 2,
    (first[2] + last[2]) / 2, (first[3] + last[3]) / 2,
  ];
}

function luminance(color: Rgba): number {
  const channels = color.slice(0, 3).map(x => {
    const v = x / 255;
    return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  return channels[0]! * .2126 + channels[1]! * .7152 + channels[2]! * .0722;
}

function contrast(a: Rgba, b: Rgba): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

function background(element: Element, cache: WeakMap<Element, Rgba>): Rgba {
  const remembered = cache.get(element);
  if (remembered) return remembered;
  const parent = element.parentElement;
  const base: Rgba = parent ? background(parent, cache) : [245, 247, 251, 1];
  const style = getComputedStyle(element);
  const backdrop = rgb(style.backgroundColor);
  let result = backdrop ? blend(backdrop, base) : base;
  // Background images render above background-color. Gradient sampling is
  // approximate; exact per-pixel verification still needs a real browser audit.
  const gradient = gradientColor(style.backgroundImage);
  if (gradient) result = blend(gradient, result);
  cache.set(element, result);
  return result;
}

function visibleText(element: Element): boolean {
  const tag = element.tagName;
  const directText = [...element.childNodes].some(node =>
    node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()));
  return directText ||
    ((tag === "BUTTON" || tag === "A") && element.querySelector("svg") !== null);
}

function replacementColor(original: Rgba, backgroundColor: Rgba): string {
  if (luminance(backgroundColor) < .3) return "#f5f7fb";
  // Preserve the VETO meaning of visible coral/red, green and blue accents.
  const [r, g, b] = original;
  if (r > g * 1.42 && r > b * 1.28) return "#a72b29";
  if (g > r * 1.34 && g > b * 1.16) return "#126846";
  if (b > r * 1.33 && b > g * 1.12) return "#245b89";
  return "#243448";
}

export function installLightContrastGuard(
  themeAttribute: "data-veto-appearance" | "data-veto-sport-appearance",
): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  const changed = new Map<HTMLElement, { value: string; priority: string; fillValue: string; fillPriority: string; gradientText: boolean }>();
  let timeout: number | undefined;
  let disposed = false;
  let lastRun = 0;

  function restore() {
    for (const [element, original] of changed) {
      if (original.value) element.style.setProperty("color", original.value, original.priority);
      else element.style.removeProperty("color");
      if (original.gradientText) {
        if (original.fillValue) element.style.setProperty("-webkit-text-fill-color", original.fillValue, original.fillPriority);
        else element.style.removeProperty("-webkit-text-fill-color");
      }
      element.removeAttribute("data-veto-contrast-repaired");
    }
    changed.clear();
    document.documentElement.removeAttribute("data-veto-contrast-repairs");
  }

  function scan() {
    if (disposed) return;
    restore();
    if (document.documentElement.getAttribute(themeAttribute) !== "light") return;
    const cache = new WeakMap<Element, Rgba>();
    const targets = document.body.querySelectorAll<HTMLElement>(TEXT_SELECTOR);
    let processed = 0;
    for (const el of targets) {
      if (++processed > 5000) break;
      if (el.closest(EXCLUSIONS) || !visibleText(el) || !el.getClientRects().length) continue;
      const style = getComputedStyle(el);
      if (style.visibility !== "visible" || style.display === "none" || Number(style.opacity) < .35) continue;
      const fill = rgb(style.webkitTextFillColor);
      const gradientText = style.webkitTextFillColor === "transparent" || fill?.[3] === 0;
      const foreground = gradientText ? gradientColor(style.backgroundImage) : rgb(style.color);
      if (!foreground || foreground[3] < .3) continue;
      const backdrop = background(el, cache);
      const finalForeground = blend(foreground, backdrop);
      if (contrast(finalForeground, backdrop) >= 3) continue;
      const color = replacementColor(foreground, backdrop);
      const candidate = rgb(color);
      if (!candidate || contrast(candidate, backdrop) < 4.5) continue;
      changed.set(el, {
        value: el.style.getPropertyValue("color"),
        priority: el.style.getPropertyPriority("color"),
        fillValue: el.style.getPropertyValue("-webkit-text-fill-color"),
        fillPriority: el.style.getPropertyPriority("-webkit-text-fill-color"),
        gradientText,
      });
      el.style.setProperty("color", color, "important");
      if (gradientText) el.style.setProperty("-webkit-text-fill-color", color, "important");
      el.setAttribute("data-veto-contrast-repaired", "");
    }
    document.documentElement.setAttribute("data-veto-contrast-repairs", String(changed.size));
  }

  function schedule() {
    if (disposed || timeout !== undefined) return;
    // Sports/markets update frequently. Avoid blocking live updates with
    // repeated full-DOM color scans; one pass per ~800ms is sufficient.
    const delay = Math.max(120, 800 - (Date.now() - lastRun));
    timeout = window.setTimeout(() => {
      timeout = undefined;
      lastRun = Date.now();
      scan();
    }, delay);
  }

  const pageObserver = new MutationObserver(schedule);
  pageObserver.observe(document.body, { subtree: true, childList: true, characterData: true });
  const themeObserver = new MutationObserver(schedule);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: [themeAttribute] });
  schedule();
  return () => {
    disposed = true;
    window.clearTimeout(timeout);
    pageObserver.disconnect();
    themeObserver.disconnect();
    restore();
  };
}
