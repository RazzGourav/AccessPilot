import { useMemo, useState } from "react";
import { StatusBadge } from "../components";
import demo from "../data/demo.json";
import { Link, Page } from "../router";

type Box = { x: number; y: number; w: number; h: number };
const findings = demo.findings as { ruleId: string; impact: string | null; help: string; target: string; wcag: string[]; box: Box | null; repairTemplate: string | null; source: string; explanation: string; userImpact: string }[];
const stops = demo.stops as { order: number; name: string; role: string; tag: string; repeated: boolean; box: Box }[];
const PAGE = demo.page;

function CaptureCrop({ src, region, outline, tone, label }: { src: string; region: Box; outline?: Box; tone?: string; label: string }) {
  const pct = (n: number, of: number) => `${(n / of) * 100}%`;
  return (
    <div className="crop-img" style={{ aspectRatio: `${region.w} / ${region.h}` }}>
      <img src={src} alt={label} loading="lazy"
        style={{ width: pct(PAGE.width, region.w), left: pct(-region.x, region.w), top: pct(-region.y, region.h) }} />
      {outline && <span className="outline" aria-hidden="true" style={{ borderColor: tone, left: pct(outline.x - region.x - 4, region.w), top: pct(outline.y - region.y - 4, region.h), width: pct(outline.w + 8, region.w), height: pct(outline.h + 8, region.h) }} />}
    </div>
  );
}

const VIEW = { x: 300, y: 0, w: 980, h: PAGE.height };
const unreachable = findings.find((f) => f.ruleId === "kbd-clickable-not-focusable");

function KeyboardStepper() {
  const [step, setStep] = useState(0);
  const n = stops.length;
  const shown = stops.slice(0, Math.min(step, n));
  const current = step >= 1 && step <= n ? stops[step - 1] : null;
  const end = step > n;
  const c = (b: Box) => [b.x + b.w / 2, b.y + b.h / 2];

  return (
    <figure className="stepper" data-ui aria-labelledby="stepper-cap">
      <div className="stepper-stage" style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}
        role="img" aria-label={`The scholarship form as scanned, with the keyboard path drawn.`}>
        <img src="/shots/golden.jpg" alt="" style={{ width: `${(PAGE.width / VIEW.w) * 100}%`, left: `${(-VIEW.x / VIEW.w) * 100}%`, top: 0 }} />
        <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} aria-hidden="true">
          {shown.length > 1 && <polyline className="path" points={shown.map((s) => c(s.box).join(",")).join(" ")} />}
          {end && unreachable?.box && (
            <g>
              <rect className="unreached" x={unreachable.box.x - 8} y={unreachable.box.y - 8} width={unreachable.box.w + 16} height={unreachable.box.h + 16} rx="6" />
              <rect className="unreached-tag" x={unreachable.box.x - 8} y={unreachable.box.y + unreachable.box.h + 14} width="196" height="30" rx="4" />
              <text className="unreached-label" x={unreachable.box.x + 4} y={unreachable.box.y + unreachable.box.h + 34}>Unreachable control</text>
            </g>
          )}
          {shown.map((s) => {
            const [x, y] = c(s.box);
            const now = current?.order === s.order;
            return (
              <g key={s.order} className={`stop${s.repeated ? " rep" : ""}${now ? " now" : ""}`}>
                {now && <rect className="ring" x={s.box.x - 8} y={s.box.y - 8} width={s.box.w + 16} height={s.box.h + 16} rx="8" />}
                <circle cx={x} cy={y} r="21" />
                <text x={x} y={y}>{s.order}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="stepper-bar">
        <button type="button" className="lime" onClick={() => setStep((s) => Math.min(s + 1, n + 1))} disabled={end}>
          <kbd aria-hidden="true">Tab</kbd>{step === 0 ? "Press Tab" : end ? "End of path" : step === n ? "Tab again" : "Next stop"}
        </button>
        <button type="button" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}>Back</button>
        {step > 0 && <button type="button" onClick={() => setStep(0)}>Reset</button>}
        <p className={`stepper-read${end ? " end" : ""}`} aria-live="polite">
          {end ? (
            <strong>Unreachable: Submit application (focus loop in chat)</strong>
          ) : current ? (
            <span>Stop {current.order} of {n}: <code>{current.tag}</code> {current.name ? `“${current.name}”` : "unnamed"}</span>
          ) : (
            <span>{n} recorded Tab stops on target</span>
          )}
        </p>
      </div>
      <figcaption id="stepper-cap" className="sr-only">Interactive keyboard path visualizer.</figcaption>
    </figure>
  );
}

const BOARD_RULES = ["label", "image-alt", "button-name", "kbd-clickable-not-focusable", "color-contrast", "html-has-lang", "heading-order", "kbd-repeated-focus"];

const SHORT_NAMES: Record<string, string> = {
  label: "Missing form label",
  "image-alt": "Missing image alt text",
  "button-name": "Empty button name",
  "kbd-clickable-not-focusable": "Clickable div not focusable",
  "color-contrast": "Low text contrast",
  "html-has-lang": "Missing html lang attribute",
  "heading-order": "Skipped heading level",
  "kbd-repeated-focus": "Focus trap loop in chat",
};

function FindingsBoard() {
  const rows = useMemo(() => BOARD_RULES.map((r) => findings.find((f) => f.ruleId === r)).filter((f): f is (typeof findings)[number] => Boolean(f)), []);
  return (
    <div className="table-wrap" data-ui>
      <table className="table board-table" aria-label="Detected findings">
        <thead>
          <tr>
            <th scope="col">Barrier</th>
            <th scope="col">Impact</th>
            <th scope="col">Standard</th>
            <th scope="col">Target element</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.ruleId}>
              <th scope="row"><strong>{SHORT_NAMES[f.ruleId] || f.help}</strong></th>
              <td><span className="badge">{f.impact ? f.impact[0].toUpperCase() + f.impact.slice(1) : "Review"}</span></td>
              <td><code>{f.wcag.length ? `WCAG ${f.wcag.join(", ")}` : "Heuristic"}</code></td>
              <td><code>{f.target}</code></td>
              <td><span className={`b-status ${f.repairTemplate ? "ready" : "person"}`}>{f.repairTemplate ? "Fix ready" : "Needs human"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiffLines({ text }: { text: string }) {
  return (
    <pre><code>{text.split("\n").filter((l) => !l.startsWith("---") && !l.startsWith("+++")).map((l, i) => (
      <span key={i} className={l.startsWith("+") ? "add" : ""}>{l + "\n"}</span>
    ))}</code></pre>
  );
}

function VerifiedProof() {
  const r = demo.repair;
  const region = (b: Box) => ({ x: Math.max(0, b.x - 40), y: Math.max(0, b.y - 56), w: Math.min(b.w + 80, PAGE.width), h: b.h + 96 });
  return (
    <div className="proof-grid" data-ui>
      <div className="card proof-card">
        <h3>Proposed Patch · <code>template/T1</code></h3>
        <DiffLines text={r.diff} />
      </div>
      <div className="card proof-card">
        <div className="proof-head">
          <StatusBadge status={r.status as "verified"} />
          <span className="proof-meta">Accessible name: <s>{r.nameBefore || "none"}</s> → <strong>“{r.nameAfter}”</strong></span>
        </div>
        <div className="crops-row">
          {r.boxBefore && (
            <figure>
              <CaptureCrop src="/shots/golden.jpg" region={region(r.boxBefore)} outline={r.boxBefore} tone="#c4242a" label="Before" />
              <figcaption className="muted">Before scan</figcaption>
            </figure>
          )}
          {r.boxAfter && r.boxBefore && (
            <figure>
              <CaptureCrop src="/shots/golden-after.jpg" region={{ ...region(r.boxBefore), h: region(r.boxBefore).h + (r.boxAfter.y - r.boxBefore.y) }} outline={r.boxAfter} tone="#1f7a4a" label="After" />
              <figcaption className="muted">Re-tested copy</figcaption>
            </figure>
          )}
        </div>
        <div className="proof-counts">
          <span className="chip resolved">Resolved: {r.resolved}</span>
          <span className="chip remaining">New: {r.new}</span>
          <span className="chip control">Control regressions: {r.controlNew}</span>
        </div>
      </div>
    </div>
  );
}

function Timings() {
  const t = demo.timings;
  const step = (name: string) => demo.trace.find((s) => s.step === name)?.durationMs ?? 0;
  const bars = [
    ["Browser start", step("browser_launched")],
    ["Page load", step("page_loaded")],
    ["WCAG scan", step("axe_completed")],
    ["Tab walk", step("keyboard_walk_completed")],
    ["Capture", step("page_captured")],
    ["Agent", t.agentMs],
    ["Fix & re-test", t.applyAndRetestMs],
  ] as [string, number][];
  const max = Math.max(...bars.map((b) => b[1]));
  const total = (t.scanMs + t.agentMs + t.applyAndRetestMs) / 1000;
  return (
    <section className="card stats-card" aria-labelledby="time-h">
      <div className="stats-header">
        <h2 id="time-h" className="section-title">Execution Latency</h2>
        <span className="num-total">{total.toFixed(1)}s total</span>
      </div>
      <ol className="bars" style={{ "--n": bars.length } as React.CSSProperties} aria-label="Step durations">
        {bars.map(([label, ms], i) => (
          <li key={label} className={i === bars.length - 1 ? "accent" : ""} style={{ "--i": i, "--h": `${Math.max((ms / max) * 100, 2)}%`, "--w": `${Math.max((ms / max) * 100, 2)}%` } as React.CSSProperties}>
            <span className="lab">{label}</span>
            <span className="val">{ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}</span>
            <span className="bar" aria-hidden="true" />
          </li>
        ))}
      </ol>
    </section>
  );
}

export function HomePage() {
  const severe = findings.filter((f) => f.impact === "critical" || f.impact === "serious").length;
  return (
    <Page title="Home">
      <div className="wrap dashboard-view">
        <div className="dash-hero">
          <div className="dash-title-row">
            <div>
              <h1 id="home-h" tabIndex={-1}>AccessPilot</h1>
              <p className="hero-sub">Deterministic accessibility auditor & isolated re-test verifier</p>
            </div>
            <div className="dash-actions">
              <Link to="/audit" className="btn primary">Start an audit</Link>
              <Link to="/how-it-works" className="btn secondary">Pipeline specs</Link>
            </div>
          </div>
          <div className="stats-strip">
            <div className="strip-item"><span className="strip-num">{findings.length}</span><span className="strip-lbl">Total findings</span></div>
            <div className="strip-item"><span className="strip-num tone-negative">{severe}</span><span className="strip-lbl">Severe barriers</span></div>
            <div className="strip-item"><span className="strip-num tone-positive">{demo.passes}</span><span className="strip-lbl">Rules passed</span></div>
            <div className="strip-item"><span className="strip-num">{stops.length}</span><span className="strip-lbl">Keyboard stops</span></div>
          </div>
        </div>

        <section className="dash-section" aria-labelledby="walker-h">
          <div className="section-header">
            <h2 id="walker-h">Keyboard Traversal Walk</h2>
            <span className="chip">Playwright Chromium · 30-stop limit</span>
          </div>
          <KeyboardStepper />
        </section>

        <section className="dash-section" aria-labelledby="board-h">
          <div className="section-header">
            <h2 id="board-h">Audit Findings</h2>
            <span className="chip">Golden Site · 10 seeded defects</span>
          </div>
          <FindingsBoard />
        </section>

        <section className="dash-section" aria-labelledby="verify-h">
          <div className="section-header">
            <h2 id="verify-h">Verification & Regression Gate</h2>
            <span className="chip">Automated re-scan · Isolated copy</span>
          </div>
          <VerifiedProof />
        </section>

        <Timings />
      </div>
    </Page>
  );
}
