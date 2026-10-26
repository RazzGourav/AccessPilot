// Visual evidence (DESIGN.md §5.2): the page as scanned with numbered barrier markers, the keyboard
// path drawn over it, and element crops for before/after. Everything is drawn from measured boxes;
// the list views (Findings, Keyboard focus path) carry the same information for non-visual use.
import { useState } from "react";
import { api } from "./api";
import type { Box, Finding, Scan } from "./types";

/** Findings that get a marker: critical, serious and keyboard findings located on the page, not page-wide. */
export function markerNumbers(scan: Scan): Map<string, number> {
  const out = new Map<string, number>();
  if (!scan.page) return out;
  const area = scan.page.width * scan.page.height;
  scan.violations.forEach((f) => {
    const severe = f.impact === "critical" || f.impact === "serious" || f.source === "keyboard-heuristic";
    if (severe && f.box && f.box.w * f.box.h < area * 0.4) out.set(f.fingerprint, out.size + 1);
  });
  return out;
}

const pct = (n: number, of: number) => `${(n / of) * 100}%`;

type Mode = "barriers" | "tab" | "friction";

function frictionLevel(f: Finding): "severe" | "high" | "moderate" {
  if (f.ruleId === "kbd-repeated-focus" || f.ruleId === "kbd-clickable-not-focusable" || f.impact === "critical") return "severe";
  if (f.impact === "serious" || f.ruleId === "label" || f.ruleId === "button-name") return "high";
  return "moderate";
}

function frictionLabel(f: Finding): string {
  if (f.ruleId === "kbd-repeated-focus") return "Focus Trap";
  if (f.ruleId === "kbd-clickable-not-focusable") return "Blocked Tab";
  if (f.ruleId === "label") return "Unlabeled Input";
  if (f.ruleId === "button-name") return "Silent Button";
  if (f.ruleId === "color-contrast") return "Contrast Strain";
  if (f.ruleId === "image-alt") return "Missing Alt";
  return f.ruleId;
}

export function PageView({ scan, selected, onSelect }: { scan: Scan; selected: string | null; onSelect: (f: Finding) => void }) {
  const [mode, setMode] = useState<Mode>("barriers");
  const page = scan.page;
  if (!page) return null;
  const numbers = markerNumbers(scan);
  const marked = scan.violations.filter((f) => numbers.has(f.fingerprint));
  const frictionNodes = scan.violations.filter((f) => f.box);
  const steps = scan.keyboardWalk.steps.filter((s) => s.box);
  const unreachable = scan.violations.filter((f) => f.ruleId === "kbd-clickable-not-focusable" && f.box);
  const centre = (b: Box) => [b.x + b.w / 2, b.y + b.h / 2];
  // Markers sit on each box's top-left corner; neighbours are pushed right so no two targets overlap
  // (WCAG 2.5.8). The gap is in page pixels: about 30 CSS px at the usual half-scale render.
  const gap = 64;
  const spots: [number, number][] = [];
  const spot = new Map<string, [number, number]>();
  for (const f of marked) {
    let [x, y] = [f.box!.x, f.box!.y];
    while (spots.some(([sx, sy]) => Math.abs(sx - x) < gap && Math.abs(sy - y) < gap)) x += gap;
    spots.push([x, y]);
    spot.set(f.fingerprint, [x, y]);
  }
  const boxStyle = (b: Box) => ({ left: pct(b.x, page.width), top: pct(b.y, page.height), width: pct(b.w, page.width), height: pct(b.h, page.height) });

  return (
    <section aria-labelledby="pv-h" className="card pageview">
      <div className="pv-head">
        <h2 id="pv-h">Page as scanned</h2>
        <div className="seg" role="group" aria-label="Overlay">
          <button type="button" aria-pressed={mode === "barriers"} onClick={() => setMode("barriers")}>Barriers ({marked.length})</button>
          <button type="button" aria-pressed={mode === "tab"} onClick={() => setMode("tab")}>Tab order ({steps.length})</button>
          <button type="button" aria-pressed={mode === "friction"} onClick={() => setMode("friction")}>Friction Heatmap ({frictionNodes.length})</button>
        </div>
      </div>
      <p className="muted pv-caption">
        {mode === "barriers"
          ? "Select a marker to view finding details."
          : mode === "tab"
          ? `${steps.length} keyboard stops · Unreachable controls highlighted`
          : `Friction Heatmap: ${frictionNodes.length} interaction friction hotspots detected across user journey.`}
      </p>
      <div className="pv-frame">
        <div className="pv-canvas" style={{ aspectRatio: `${page.width} / ${page.height}` }}>
          <img src={api.screenshotUrl(scan.scanId)} alt={`Screenshot of ${scan.title || scan.finalUrl} as scanned.`} />
          {mode === "barriers" && marked.map((f) => {
            const n = numbers.get(f.fingerprint)!;
            const sev = f.impact ?? "review";
            return (
              <div key={f.fingerprint}>
                <div className={`pv-box sev-${sev}${selected === f.fingerprint ? " on" : ""}`} style={boxStyle(f.box!)} aria-hidden="true" />
                <button type="button" className={`pv-marker sev-${sev}${selected === f.fingerprint ? " on" : ""}`}
                  style={{ left: pct(spot.get(f.fingerprint)![0], page.width), top: pct(spot.get(f.fingerprint)![1], page.height), "--i": n } as React.CSSProperties}
                  aria-label={`Marker ${n}: ${f.help}, ${f.impact ?? "needs review"}. Open in findings.`} onClick={() => onSelect(f)}>
                  {n}
                </button>
              </div>
            );
          })}
          {mode === "tab" && (
            <>
              <svg className="pv-path" viewBox={`0 0 ${page.width} ${page.height}`} preserveAspectRatio="none" aria-hidden="true">
                <polyline points={steps.map((s) => centre(s.box!).join(",")).join(" ")} vectorEffect="non-scaling-stroke" />
              </svg>
              {unreachable.map((f) => (
                <div key={f.fingerprint} className="pv-box pv-unreached" style={boxStyle(f.box!)} aria-hidden="true">
                  <span>Never reached by Tab</span>
                </div>
              ))}
              {steps.map((s) => {
                const [cx, cy] = centre(s.box!);
                return <span key={s.order} className={`pv-stop${s.repeated ? " rep" : ""}`} style={{ left: pct(cx, page.width), top: pct(cy, page.height), "--i": s.order } as React.CSSProperties} aria-hidden="true">{s.order}</span>;
              })}
            </>
          )}
          {mode === "friction" && frictionNodes.map((f) => {
            const lvl = frictionLevel(f);
            const lbl = frictionLabel(f);
            return (
              <div
                key={f.fingerprint}
                className={`pv-friction-hotspot level-${lvl}${selected === f.fingerprint ? " on" : ""}`}
                style={boxStyle(f.box!)}
                onClick={() => onSelect(f)}
                title={`${lbl} (${lvl} friction): Click to view finding`}
              >
                <span className={`pv-friction-pill level-${lvl}`}>{lbl}</span>
              </div>
            );
          })}
        </div>
      </div>
      {page.truncated && <p className="muted pv-caption">The capture stops at {page.height} px; findings further down are only in the list.</p>}
    </section>
  );
}

/** A crop of one element from a scan's capture, outlined. */
export function Crop({ scan, box, label, tone = "neutral" }: { scan: Scan; box: Box; label: string; tone?: "neutral" | "before" | "after" }) {
  if (!scan.page) return null;
  // At least 420 page px wide so a small control renders near 1:1 instead of blown up.
  const pad = 24;
  const w = Math.min(Math.max(box.w + pad * 2, 420), scan.page.width);
  const h = Math.min(Math.max(box.h + pad * 2, 96), scan.page.height);
  const x = Math.min(Math.max(0, box.x + box.w / 2 - w / 2), scan.page.width - w);
  const y = Math.min(Math.max(0, box.y + box.h / 2 - h / 2), scan.page.height - h);
  return (
    <figure className={`crop crop-${tone}`}>
      <svg viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={label}>
        <image href={api.screenshotUrl(scan.scanId)} width={scan.page.width} height={scan.page.height} />
        <rect x={box.x - 3} y={box.y - 3} width={box.w + 6} height={box.h + 6} rx="4" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

/** Where the same element sits in another scan (layout can shift after a fix). */
export function locate(scan: Scan, target: string, fallback: Box): Box {
  return scan.violations.find((f) => f.target === target && f.box)?.box
    ?? scan.keyboardWalk.steps.find((s) => s.selector === target && s.box)?.box
    ?? fallback;
}

/** The accessible name the keyboard walk measured for an element, if it is focusable. */
export function nameOf(scan: Scan, target: string): string | null {
  const stop = scan.keyboardWalk.steps.find((s) => s.selector === target);
  return stop ? stop.name : null;
}

export function MarkerTag({ n }: { n: number | undefined }) {
  return n ? <span className="tag">Marker {n}</span> : null;
}

