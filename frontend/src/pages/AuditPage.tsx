import { PageView } from "../evidence";
import { Link, Page } from "../router";
import { useSession } from "../session";
import { Timeline } from "../timeline";
import { PageHero, ResultsHeader, ScanFacts, StatusArea } from "./shared";

export function AuditPage() {
  const s = useSession();
  const { scan, health, busy } = s;
  return (
    <Page title="Audit">
      <PageHero app title="Audit Workspace">
        {scan && <ScanFacts scan={scan} />}
      </PageHero>
      <div className="wrap page-body">
        <section aria-labelledby="audit-h" className={`card intake-card${scan ? " compact" : ""}`}>
          <h2 id="audit-h">Target Endpoint</h2>
          <form className="intake" onSubmit={(e) => { e.preventDefault(); s.startScan(); }}>
            <label htmlFor="url" className="sr-only">Page URL</label>
            <div className="row">
              <input id="url" type="url" required placeholder="https://example.com" value={s.url} onChange={(e) => s.setUrl(e.target.value)} aria-describedby="url-help" />
              <button type="submit" className={scan ? "" : "primary"} disabled={busy !== null}>{busy === "scan" ? "Scanning…" : scan ? "Scan again" : "Scan"}</button>
            </div>
            <div className="intake-footer">
              <div className="check">
                <input id="auth" type="checkbox" checked={s.authorized} onChange={(e) => s.setAuthorized(e.target.checked)} />
                <label htmlFor="auth">Authorised test target</label>
              </div>
              {health && (
                <div className="quick-targets" id="url-help">
                  <span className="muted">Fixtures:</span>
                  <button type="button" className="chip" onClick={() => s.setUrl(health.demoUrl)}>Golden Site (D01–D10)</button>
                  <button type="button" className="chip" onClick={() => s.setUrl(health.controlUrl)}>Control Page</button>
                </div>
              )}
            </div>
          </form>
        </section>

        <StatusArea />

        {scan && (
          <>
            <ResultsHeader scan={scan} />
            <div className="layout">
              <div className="main-col">
                <PageView scan={scan} selected={s.selected} onSelect={s.showFinding} />
                <section aria-labelledby="timeline-h" className="card">
                  <h2 id="timeline-h">Execution Trace</h2>
                  <Timeline events={s.events} currentScanId={scan.scanId} status={s.repairStatus} rejected={s.rejected} busy={busy !== null}
                    modelLabel={s.modelLabel} onReview={s.openProposal} working={busy === "agent"} />
                </section>
              </div>
              <div className="side">
                <section aria-labelledby="next-h" className="card next">
                  <h2 id="next-h">Remediation Action</h2>
                  {!s.agentRan ? (
                    <div className="next-box">
                      <div className="next-meta">
                        <span className="chip">Status: Ready</span>
                        <span className="chip">Model: {s.modelLabel}</span>
                      </div>
                      <button type="button" className="primary" onClick={s.runAgent} disabled={busy !== null}>
                        {busy === "agent" ? "Agent running…" : "Run agent"}
                      </button>
                    </div>
                  ) : s.waiting.length ? (
                    <div className="next-box">
                      <div className="next-meta">
                        <span className="chip tone-positive">{s.waiting.length} pending approval</span>
                      </div>
                      <button type="button" className="primary" onClick={() => s.openProposal(s.waiting[0])} disabled={busy !== null}>
                        Review first proposal
                      </button>
                    </div>
                  ) : (
                    <p className="muted">All proposals reviewed. See <Link to="/findings">Findings</Link> or <Link to="/report">Report</Link>.</p>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </Page>
  );
}
