import { api } from "../api";
import { CoveragePanel, StatusBadge } from "../components";
import { Page } from "../router";
import { useSession } from "../session";
import { NoScan, PageHero, ResultsHeader, ScanFacts, StatusArea } from "./shared";

export function ReportPage() {
  const s = useSession();
  const { scan } = s;
  return (
    <Page title="Report">
      <PageHero app title="Audit & Verification Report">
        {scan && <ScanFacts scan={scan} />}
      </PageHero>
      <div className="wrap page-body">
      <StatusArea />
      {!scan ? <NoScan what="The report and its export" /> : (
        <>
          <ResultsHeader scan={scan} />
          <section aria-labelledby="outcomes-h" className="card">
            <h2 id="outcomes-h">Repair outcomes this session</h2>
            {s.repairs.length === 0 ? <p className="muted">No repairs were approved in this session.</p> : (
              <table className="table">
                <caption className="sr-only">Each approved repair with its re-test result and regression gate</caption>
                <thead><tr><th scope="col">Fix</th><th scope="col">Approved</th><th scope="col">Result</th><th scope="col" className="num">Resolved</th><th scope="col" className="num">New</th><th scope="col">Control page</th></tr></thead>
                <tbody>
                  {s.repairs.map((e) => (
                    <tr key={e.result.proposalId}>
                      <th scope="row">{s.findingFor(e.proposal.fingerprint)?.help ?? e.proposal.fingerprint} <span className="muted">({e.proposal.template})</span></th>
                      <td className="num">{e.result.approvedAt.slice(11, 19)}</td>
                      <td><StatusBadge status={e.result.status} /></td>
                      <td className="num">{e.result.comparison?.resolved.length ?? 0}</td>
                      <td className="num">{e.result.comparison?.new.length ?? 0}</td>
                      <td>{e.result.controlPage ? (e.result.controlPage.newSeriousOrCritical.length ? "Regression" : "No regression") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p><a className="btn" href={api.reportUrl(scan.scanId)} download>Download the JSON report</a></p>
          </section>

          {/* Continuous Verification & Audit Trail */}
          {(() => {
            const scansInSession = s.events
              .filter((e): e is { kind: "scan" | "continue"; scan: typeof scan } => e.kind === "scan" || e.kind === "continue")
              .map((e) => e.scan);

            const initialCount = scansInSession[0]?.violations.length ?? 0;

            return scansInSession.length > 0 ? (
              <section aria-labelledby="history-h" className="card mb-m">
                <div className="row spread align-center mb-s">
                  <h2 id="history-h" className="m-0">Continuous Verification History ({scansInSession.length})</h2>
                  <span className="muted text-xs">Deterministic audit trail across session runs</span>
                </div>
                <table className="table">
                  <caption className="sr-only">Sequential scan results and barrier reduction trend</caption>
                  <thead>
                    <tr>
                      <th scope="col">Run</th>
                      <th scope="col">Target / Copy</th>
                      <th scope="col">Timestamp</th>
                      <th scope="col" className="num">Duration</th>
                      <th scope="col" className="num">Active Barriers</th>
                      <th scope="col" className="num">Net Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scansInSession.map((sc, idx) => {
                      const delta = sc.violations.length - initialCount;
                      return (
                        <tr key={sc.scanId} className={sc.scanId === scan.scanId ? "current-row" : ""}>
                          <th scope="row">
                            #{idx + 1} <code>{sc.scanId.slice(0, 12)}</code>
                            {sc.scanId === scan.scanId && <span className="chip tone-positive mini">Active</span>}
                          </th>
                          <td className="cell-truncate">
                            {sc.workspaceId ? `Copy ${sc.workspaceId}` : sc.title || sc.finalUrl}
                          </td>
                          <td className="num">{sc.createdAt.slice(11, 19)}</td>
                          <td className="num">{(sc.durationMs / 1000).toFixed(1)}s</td>
                          <td className="num"><strong>{sc.violations.length}</strong></td>
                          <td className="num">
                            {idx === 0 ? (
                              <span className="muted">Baseline</span>
                            ) : delta < 0 ? (
                              <span className="tone-positive"><strong>{delta}</strong> resolved</span>
                            ) : delta === 0 ? (
                              <span className="muted">0</span>
                            ) : (
                              <span className="pill-warning-ink">+{delta}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ) : null;
          })()}

          <CoveragePanel coverage={scan.coverage} limitations={scan.limitations} />
        </>
      )}
      </div>
    </Page>
  );
}
