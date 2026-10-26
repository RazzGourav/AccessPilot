import { useMemo, useState } from "react";
import { StatusBadge } from "../components";
import demo from "../data/demo.json";
import { Icon } from "../icons";
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
  return (
    <Page title="Home">
      <div className="wrap dashboard-view">
        {/* Pro Hero Section */}
        <section className="home-pro-hero" aria-labelledby="home-h">
          <div className="hero-badge-row">
            <span className="badge badge-ai"><Icon name="spark" size={13} /> Multi-Agent Accessibility Platform</span>
          </div>
          <h1 id="home-h" tabIndex={-1}>
            Don’t just detect barriers. <span className="hero-highlight">Prove the fix.</span>
          </h1>
          <p className="hero-sub">
            AccessPilot pairs real-browser axe-core audits and keyboard traversal walks with bounded AI remediation agents. It identifies accessibility barriers, proposes deterministic code repairs, executes them in isolated working copies, and verifies each change with automated re-scans and regression gates.
          </p>
          <div className="hero-cta-group">
            <Link to="/audit" className="btn primary btn-lg"><Icon name="mark" size={15} /> Start an audit</Link>
            <Link to="/experience" className="btn btn-lg"><Icon name="speaker" size={15} /> Lived Experience</Link>
            <Link to="/dashboard" className="btn btn-lg"><Icon name="clock" size={15} /> Impact & ROI</Link>
          </div>
          <div className="hero-quick-targets">
            <span className="muted">Instant demo targets:</span>
            <Link to="/audit" className="chip">Golden Site (10 seeded defects)</Link>
            <Link to="/audit" className="chip">Control Page (baseline)</Link>
            <Link to="/audit" className="chip">W3C Bad Demo (live target)</Link>
            <Link to="/audit" className="chip">Wikipedia A11y (public site)</Link>
          </div>
          <div className="hero-trust-strip">
            <div className="trust-cell">
              <span className="trust-title"><Icon name="check" size={14} /> axe-core 4.10.2</span>
              <p className="trust-desc">Deterministic WCAG 2.0/2.1/2.2 Level A/AA rules running offline in Playwright Chromium.</p>
            </div>
            <div className="trust-cell">
              <span className="trust-title"><Icon name="dot" size={14} /> 30-Stop Keyboard Walk</span>
              <p className="trust-desc">Real focus traversal detecting focus trap loops, cycle repeats, and unreachable controls.</p>
            </div>
            <div className="trust-cell">
              <span className="trust-title"><Icon name="spark" size={14} /> Sandboxed Repairs</span>
              <p className="trust-desc">Changes applied exclusively to temporary working copies with single-use approval tokens.</p>
            </div>
            <div className="trust-cell">
              <span className="trust-title"><Icon name="ring" size={14} /> Empirical Re-Test Gate</span>
              <p className="trust-desc">Automated re-scan verifies resolved findings and guards against control-page regressions.</p>
            </div>
          </div>
        </section>

        {/* Feature Pillars Grid */}
        <section className="pillars-section" aria-labelledby="pillars-h">
          <div className="section-headline-group">
            <h2 id="pillars-h">Built on Evidence, Not Opinion</h2>
            <p>Four architectural principles distinguishing AccessPilot from legacy scan-and-dump tools.</p>
          </div>
          <div className="pillars-grid">
            <div className="card pillar-card">
              <h3><Icon name="check" size={16} /> Deterministic Auditing</h3>
              <p>
                Real Playwright Chromium browser session executing axe-core 4.10.2 locally without external network dependencies. Combines automated standard checks with empirical keyboard traversal heuristics.
              </p>
              <div className="tag-row">
                <span className="tag">WCAG 2.2 AA</span>
                <span className="tag">Section 508</span>
                <span className="tag">axe-core</span>
              </div>
            </div>
            <div className="card pillar-card">
              <h3><Icon name="spark" size={16} /> Multi-Agent Remediation</h3>
              <p>
                Specialized coordinator, scanner, impact analyzer, and code fixer agents collaborate within bounded limits (8 turns, 14 tool calls) to diagnose barrier severity and draft precise code replacements.
              </p>
              <div className="tag-row">
                <span className="tag">GitHub Models</span>
                <span className="tag">Azure OpenAI</span>
                <span className="tag">Deterministic Fallback</span>
              </div>
            </div>
            <div className="card pillar-card">
              <h3><Icon name="speaker" size={16} /> Lived Experience & Hindi Voice</h3>
              <p>
                Empirical screen reader speech synthesis supporting both English and Hindi (hi-IN) voice output. Simulates lived navigation friction across Blindness, Motor Impairment, and Cognitive overload personas.
              </p>
              <div className="tag-row">
                <span className="tag">Web Speech API</span>
                <span className="tag">Hindi (hi-IN)</span>
                <span className="tag">Friction Heatmap</span>
              </div>
            </div>
            <div className="card pillar-card">
              <h3><Icon name="clock" size={16} /> Isolated Verification Gate</h3>
              <p>
                Every proposed fix is reviewed by a human before application. Patches execute in an isolated sandbox copy, followed by an immediate automated re-scan and control-page regression test.
              </p>
              <div className="tag-row">
                <span className="tag">Single-use Token</span>
                <span className="tag">Working Copy</span>
                <span className="tag">Zero False Claims</span>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Keyboard Walk Simulation */}
        <section className="dash-section" aria-labelledby="walker-h">
          <div className="section-header">
            <h2 id="walker-h">Keyboard Traversal Walk</h2>
            <span className="chip">Playwright Chromium · 30-stop limit</span>
          </div>
          <KeyboardStepper />
        </section>

        {/* Public Target AI Fix Prompt Banner */}
        <section className="card ai-prompt-card" aria-labelledby="public-prompt-h">
          <div className="ai-prompt-header">
            <div className="ai-prompt-title-group">
              <span className="badge badge-ai"><Icon name="spark" size={13} /> Developer Workflow</span>
              <h2 id="public-prompt-h" className="ai-prompt-title">1-Click Prompt Generation for AI Coding Assistants</h2>
              <p className="ai-prompt-desc">
                When auditing public URLs or your own git repositories, AccessPilot compiles all detected barrier selectors, HTML snippets, and recommended code replacements into a single structured prompt ready to paste into Cursor, GitHub Copilot, or Claude Code.
              </p>
            </div>
            <div className="ai-prompt-actions">
              <Link to="/audit" className="btn primary">
                <Icon name="spark" size={14} /> Try it on Audit page
              </Link>
            </div>
          </div>
        </section>

        {/* Seeded Golden Site Audit Findings */}
        <section className="dash-section" aria-labelledby="board-h">
          <div className="section-header">
            <h2 id="board-h">Seeded Benchmark Findings</h2>
            <span className="chip">Golden Site · 10 seeded defects</span>
          </div>
          <FindingsBoard />
        </section>

        {/* Verification Proof & Regression Gate */}
        <section className="dash-section" aria-labelledby="verify-h">
          <div className="section-header">
            <h2 id="verify-h">Verification & Regression Gate</h2>
            <span className="chip">Automated re-scan · Isolated copy</span>
          </div>
          <VerifiedProof />
        </section>

        {/* Statutory Compliance & Exposure Banner */}
        <section className="statutory-banner" aria-labelledby="stat-h">
          <div className="section-headline-group">
            <h2 id="stat-h">Statutory Standards & Developer Hours Saved</h2>
            <p>AccessPilot maps technical defects directly to national and international accessibility statutes.</p>
          </div>
          <div className="statutory-grid">
            <div className="stat-box">
              <strong>India RPwD Act 2016</strong>
              <span>Mandates GIGW 3.0 and IS 17802 for public and commercial digital services.</span>
              <span className="stat-exposure">Statutory exposure: ₹5,00,000</span>
            </div>
            <div className="stat-box">
              <strong>European Accessibility Act (EAA)</strong>
              <span>EN 301 549 harmonization enforcing digital accessibility across EU markets by 2025.</span>
              <span className="stat-exposure">Market withdrawal risk</span>
            </div>
            <div className="stat-box">
              <strong>Developer Hours Saved</strong>
              <span>Automated deterministic remediation cuts manual barrier investigation and fix drafting time.</span>
              <span className="stat-exposure" style={{ color: "var(--positive)" }}>80%+ remediation time reduction</span>
            </div>
          </div>
        </section>

        {/* Execution Latency Timings */}
        <Timings />

        {/* Home CTA Card */}
        <div className="home-cta-card">
          <h2>Ready to audit your web application?</h2>
          <p>
            Scan any authorized URL, run the remediation agent, simulate screen reader speech, or verify code repairs in an isolated working copy.
          </p>
          <div className="hero-cta-group" style={{ margin: 0 }}>
            <Link to="/audit" className="btn primary btn-lg">Open Audit Workspace</Link>
            <Link to="/how" className="btn btn-lg">Read Pipeline Specs</Link>
          </div>
        </div>
      </div>
    </Page>
  );
}
