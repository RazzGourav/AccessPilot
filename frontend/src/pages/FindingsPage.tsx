import { useMemo, useState } from "react";
import { ImpactBadge, KeyboardPath } from "../components";
import { MarkerTag, markerNumbers } from "../evidence";
import { Icon } from "../icons";
import { Page } from "../router";
import { useSession } from "../session";
import type { Finding } from "../types";
import { AiFixPromptCard, NoScan, PageHero, ScanFacts, StatusArea } from "./shared";

export function FindingsPage() {
  const s = useSession();
  const { scan, busy, selected } = s;
  const [impactFilter, setImpactFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [copiedFp, setCopiedFp] = useState<string | null>(null);

  function copyCode(fp: string, code: string) {
    navigator.clipboard.writeText(code);
    setCopiedFp(fp);
    setTimeout(() => setCopiedFp(null), 2000);
  }

  const numbers = useMemo(() => (scan ? markerNumbers(scan) : new Map<string, number>()), [scan]);
  const groups = useMemo(() => {
    const out = new Map<string, Finding[]>();
    for (const f of scan?.violations ?? []) {
      if (impactFilter !== "all" && (impactFilter === "review" ? f.impact !== null : f.impact !== impactFilter)) continue;
      if (sourceFilter !== "all" && f.source !== sourceFilter) continue;
      out.set(f.ruleId, [...(out.get(f.ruleId) ?? []), f]);
    }
    return [...out.entries()];
  }, [scan, impactFilter, sourceFilter]);

  return (
    <Page title="Findings">
      <PageHero app title="Findings Inventory">
        {scan && <ScanFacts scan={scan} />}
      </PageHero>
      <div className="wrap page-body">
      <StatusArea />
      {!scan ? <NoScan what="Findings" /> : (
        <>
          <AiFixPromptCard scan={scan} />
          <section aria-labelledby="findings-h" className="card findings">
            <h2 id="findings-h">{scan.violations.length} findings on {scan.title || scan.finalUrl}</h2>
            <div className="filters">
              <label>Impact{" "}
                <select value={impactFilter} onChange={(e) => setImpactFilter(e.target.value)}>
                  <option value="all">All</option><option value="critical">Critical</option><option value="serious">Serious</option>
                  <option value="moderate">Moderate</option><option value="minor">Minor</option><option value="review">Needs review</option>
                </select>
              </label>
              <label>Source{" "}
                <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                  <option value="all">All</option><option value="axe">axe-core</option><option value="keyboard-heuristic">Keyboard heuristic</option>
                </select>
              </label>
            </div>
            {groups.length === 0 && <p>No findings match these filters.</p>}
            {groups.map(([rule, items]) => (
              <details key={rule} className="group" open={items.some((f) => f.fingerprint === selected) || undefined}>
                <summary>
                  <ImpactBadge impact={items[0].impact} /> <strong>{items[0].help}</strong>{" "}
                  <span className="muted">({rule}, {items.length} {items.length === 1 ? "element" : "elements"})</span>
                </summary>
                <p>{items[0].description}{items[0].wcag.length > 0 && <> WCAG {items[0].wcag.join(", ")}.</>}{" "}
                  {items[0].helpUrl && <a href={items[0].helpUrl} target="_blank" rel="noreferrer">Rule guidance<span className="sr-only"> (opens in new tab)</span></a>}</p>
                {items.map((f) => {
                  const ex = s.explanations.get(f.fingerprint);
                  return (
                    <article key={f.fingerprint} id={`f-${scan.violations.indexOf(f)}`} tabIndex={-1} className={`node${selected === f.fingerprint ? " selected" : ""}`}>
                      <p><span className="muted">Target</span> <code>{f.target}</code> <span className="tag">{f.source}</span> <MarkerTag n={numbers.get(f.fingerprint)} /></p>
                      {f.snippet && <pre className="snippet">{f.snippet}</pre>}
                      {f.failureSummary && <p className="muted pre">{f.failureSummary}</p>}
                      {ex && (
                        <div className={`explain ${ex.generatedBy}`}>
                          <p className="label">{ex.generatedBy === "ai" ? `AI-generated advice · confidence ${Math.round(ex.confidence * 100)}%` : "Built-in guidance"}
                            {ex.needsHumanReview && " · needs human review"}</p>
                          <p>{ex.explanation} {ex.userImpact}</p>
                          <p><strong>Suggested:</strong> {ex.suggestedAction}</p>
                          {ex.suggestedCode && (
                            <div className="code-fix-suggestion">
                              <div className="code-fix-head">
                                <span className="code-fix-title">Code fix recommendation:</span>
                                <button type="button" className="chip mini" onClick={() => copyCode(f.fingerprint, ex.suggestedCode!)}>
                                  {copiedFp === f.fingerprint ? "Copied!" : "Copy fix snippet"}
                                </button>
                              </div>
                              <pre className="code-fix-snippet">{ex.suggestedCode}</pre>
                            </div>
                          )}
                        </div>
                      )}
                      {scan.repairable && f.repairTemplate ? (
                        <button type="button" onClick={() => s.proposeFor(f)} disabled={busy !== null}>
                          Propose fix ({f.repairTemplate})<span className="sr-only"> for {f.ruleId} on {f.target}</span>
                        </button>
                      ) : (
                        <span className="status status-needs_human"><Icon name="question" size={12} />{scan.repairable ? "Needs human review" : "Report only"}</span>
                      )}
                    </article>
                  );
                })}
              </details>
            ))}
            {scan.incomplete.length > 0 && (
              <details className="group">
                <summary><strong>Incomplete checks axe could not decide</strong> <span className="muted">({scan.incomplete.length})</span></summary>
                <ul>{scan.incomplete.map((f) => <li key={f.fingerprint}><code>{f.ruleId}</code> on <code>{f.target}</code>: {f.help}</li>)}</ul>
              </details>
            )}
          </section>
          <KeyboardPath scan={scan} />
        </>
      )}
      </div>
    </Page>
  );
}
