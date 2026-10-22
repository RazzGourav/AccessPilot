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
          <CoveragePanel coverage={scan.coverage} limitations={scan.limitations} />
        </>
      )}
      </div>
    </Page>
  );
}
