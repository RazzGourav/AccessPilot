// Pieces shared by the app pages: live status, empty state, and the results header.
import { useEffect, useMemo, type ReactNode } from "react";
import { api } from "../api";
import { Summary } from "../components";
import { Icon } from "../icons";
import { Link } from "../router";
import { useSession } from "../session";
import type { Scan } from "../types";

export function StatusArea() {
  const { busy, status, error } = useSession();
  return (
    <>
      <div aria-live="polite" className="status-line">{busy ? <span className="spinner" aria-hidden="true" /> : null}{status}</div>
      {error && <div role="alert" className="error">{error}</div>}
    </>
  );
}

/** Shown on Findings, Repairs and Report before any scan exists. */
export function NoScan({ what }: { what: string }) {
  return (
    <section className="card empty" aria-labelledby="empty-h">
      <h2 id="empty-h">Nothing to show yet</h2>
      <p>{what} appear here after a scan. Scans are kept in memory for this session only.</p>
      <p><Link to="/audit" className="btn primary">Start an audit</Link></p>
    </section>
  );
}

/** The screen's one finding (app-screens §2.2): severe barriers, and the keyboard blocker if there is one. */
export function findingSentence(scan: Scan): string {
  const severe = scan.violations.filter((f) => f.impact === "critical" || f.impact === "serious").length;
  const blocked = scan.violations.find((f) => f.ruleId === "kbd-clickable-not-focusable")?.description.match(/^"(.+?)"/)?.[1];
  const head = severe ? `${severe} severe barriers detected` : "No severe barriers detected";
  return blocked ? `${head} · Keyboard trapped before “${blocked}”` : head;
}

export function ResultsHeader({ scan }: { scan: Scan }) {
  const { agentRan, repairs, waiting, verifiedCount } = useSession();
  const finding = useMemo(() => findingSentence(scan), [scan]);
  return (
    <section aria-labelledby="results-h" className="card">
      <h2 id="results-h">Target: {scan.title || scan.finalUrl}</h2>
      <p className="finding">{finding}</p>
      <ol className="stages" aria-label="Progress">
        <li className="done"><Icon name="check" size={12} /><span>Scanned</span><span className="stage-n">{scan.violations.length} findings</span></li>
        <li className={agentRan ? "done" : "now"}><Icon name={agentRan ? "check" : "dot"} size={12} /><span>Explained</span><span className="stage-n">{agentRan ? "by the agent" : "next"}</span></li>
        <li className={repairs.length ? "done" : agentRan ? "now" : "todo"}><Icon name={repairs.length ? "check" : agentRan ? "dot" : "ring"} size={12} /><span>Approved</span><span className="stage-n">{agentRan ? `${repairs.length} of ${repairs.length + waiting.length} fixes` : "after the agent"}</span></li>
        <li className={verifiedCount ? "done" : "todo"}><Icon name={verifiedCount ? "check" : "ring"} size={12} /><span>Verified by re-test</span><span className="stage-n">{verifiedCount}</span></li>
      </ol>
      <Summary scan={scan} />
      <p className="meta-line muted">
        <code>{scan.finalUrl}</code> · {(scan.durationMs / 1000).toFixed(1)}s · {scan.scanner} {scan.scannerVersion}
        {scan.workspaceId && <> · working copy <code>{scan.workspaceId}</code></>}
        {" · "}<a href={api.reportUrl(scan.scanId)} download>Export JSON report</a>
      </p>
    </section>
  );
}

/** The forest band that opens every page except Home: the page's h1, one sentence, optional live facts. */
export function PageHero({ title, lede, children, app }: { title: string; lede?: string; children?: ReactNode; app?: boolean }) {
  return (
    <div className={`page-hero${app ? " page-hero-app" : ""}`}>
      <div className="wrap">
        <h1 tabIndex={-1}>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
    </div>
  );
}

/** Live facts for a page hero, from the current scan. */
export function ScanFacts({ scan }: { scan: Scan }) {
  const severe = scan.violations.filter((f) => f.impact === "critical" || f.impact === "serious").length;
  return (
    <p className="hero-meta">
      <span><strong>{scan.violations.length}</strong> findings</span>
      <span><strong>{severe}</strong> critical or serious</span>
      <span><strong>{scan.passesCount}</strong> rules passed</span>
      <span><strong>{scan.keyboardWalk.steps.length}</strong> Tab stops</span>
    </p>
  );
}

/** Scroll reveal for content pages: parts of each section rise in as they enter. The hidden start state
 *  is added by script only, so with no script, reduced motion or print everything is simply visible. */
export function useReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    els.forEach((el) => el.classList.add("reveal-pending"));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("reveal-in");
        io.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/** Stagger delay for a revealed element. */
export const delay = (n: number) => ({ "--d": `${n * 80}ms` } as React.CSSProperties);
