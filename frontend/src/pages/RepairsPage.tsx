import { useRef } from "react";
import { Diff, StatusBadge, Verification } from "../components";
import { Crop, locate, nameOf } from "../evidence";
import { Icon } from "../icons";
import { Link, Page } from "../router";
import { useSession } from "../session";
import { NoScan, PageHero, ScanFacts, StatusArea } from "./shared";

export function RepairsPage() {
  const s = useSession();
  const { scan, proposal, result, afterScan, busy, templates } = s;
  const verifyRef = useRef<HTMLHeadingElement>(null);
  const tpl = proposal?.template ? templates.find((t) => t.id === proposal.template) : undefined;

  return (
    <Page title="Repairs">
      <PageHero app title="Repairs & Approval Gate">
        {scan && <ScanFacts scan={scan} />}
      </PageHero>
      <div className="wrap page-body">
      <StatusArea />
      {!scan ? <NoScan what="Drafted fixes" /> : (
        <div className="layout">
          <div className="main-col">
            <section aria-labelledby="queue-h" className="card">
              <h2 id="queue-h">Waiting for review ({s.waiting.length})</h2>
              {s.waiting.length === 0 ? (
                <p className="muted">{s.agentRan ? "No fixes are waiting." : <>No fixes yet. <Link to="/audit">Run the agent on the Audit page</Link> to draft them.</>}</p>
              ) : (
                <ul className="queue">
                  {s.waiting.map((p) => (
                    <li key={p.proposalId} className={proposal?.proposalId === p.proposalId ? "on" : ""}>
                      <span className="queue-main"><strong>{s.findingFor(p.fingerprint)?.help ?? p.fingerprint}</strong>
                        <span className="muted"><code>{s.findingFor(p.fingerprint)?.target}</code> · template {p.template}{p.needsHumanEdit.length > 0 && " · wording to check"}</span></span>
                      <button type="button" onClick={() => s.openProposal(p)} disabled={busy !== null} aria-pressed={proposal?.proposalId === p.proposalId}>
                        Review<span className="sr-only"> {s.findingFor(p.fingerprint)?.help}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="done-h" className="card">
              <h2 id="done-h">Decided ({s.repairs.length})</h2>
              {s.repairs.length === 0 ? <p className="muted">Approved fixes and their re-test results will be listed here.</p> : (
                <table className="table">
                  <caption className="sr-only">Approved repairs and their re-test results</caption>
                  <thead><tr><th scope="col">Fix</th><th scope="col">Template</th><th scope="col">Re-test result</th><th scope="col" className="num">Resolved</th><th scope="col" className="num">New</th></tr></thead>
                  <tbody>
                    {s.repairs.map((e) => (
                      <tr key={e.result.proposalId}>
                        <th scope="row">{s.findingFor(e.proposal.fingerprint)?.help ?? e.proposal.fingerprint}</th>
                        <td>{e.proposal.template}</td>
                        <td><StatusBadge status={e.result.status} /></td>
                        <td className="num">{e.result.comparison?.resolved.length ?? 0}</td>
                        <td className="num">{e.result.comparison?.new.length ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          <div className="side">
            {proposal && (
              <section aria-labelledby="review-h" className="card review">
                <h2 id="review-h" tabIndex={-1}>Review proposed change</h2>
                <p><StatusBadge status={proposal.status} /> <span className="tag">{proposal.proposedBy === "ai" ? "drafted by AI agent" : proposal.proposedBy === "deterministic" ? "built-in template" : "template"}</span></p>
                <p><strong>{tpl?.title ?? s.findingFor(proposal.fingerprint)?.help}</strong></p>
                {(() => { const f = s.findingFor(proposal.fingerprint); return f?.box ? <Crop scan={scan} box={f.box} label={`The element now: ${f.target}`} tone="before" /> : null; })()}
                <p>{proposal.rationale}</p>
                {proposal.status === "suggested" && (
                  <p className="why"><Icon name="question" size={12} /><span><strong>Why this needs you:</strong> {proposal.needsHumanEdit.length
                    ? `the ${proposal.needsHumanEdit.join(", ").toLowerCase()} is a judgement call only a person can make.`
                    : "it changes code. AccessPilot applies nothing until you approve, and only to an isolated copy."}</span></p>
                )}
                {proposal.status === "suggested" ? (
                  <>
                    <p className="muted">Files: {proposal.allowedFiles.join(", ")} · Risk: {proposal.risk}</p>
                    {tpl?.params.map((p) => (
                      <div key={p.name} className="param">
                        <label htmlFor={`param-${p.name}`}>{p.label}{p.humanEdit && " (check this wording)"}</label>
                        <div className="row">
                          <input id={`param-${p.name}`} value={s.params[p.name] ?? ""} maxLength={150}
                            onChange={(e) => s.setParams({ ...s.params, [p.name]: e.target.value })} />
                          <button type="button" onClick={s.updatePreview} disabled={busy !== null}>Update diff</button>
                        </div>
                      </div>
                    ))}
                    <Diff text={proposal.diff} />
                    <div className="row">
                      <button type="button" className="primary" onClick={s.approve} disabled={busy !== null}>{busy === "apply" ? "Applying and re-testing…" : "Approve and apply to working copy"}</button>
                      <button type="button" onClick={s.reject} disabled={busy !== null}>Reject</button>
                    </div>
                  </>
                ) : (
                  <button type="button" onClick={() => s.setProposal(null)}>Close</button>
                )}
              </section>
            )}

            {result && !proposal && (
              <Verification result={result} headingRef={verifyRef} onContinue={() => s.continueWith(result)} busy={busy !== null}>
                {(() => {
                  const ev = s.repairs.find((e) => e.result.proposalId === result.proposalId);
                  const f = ev ? s.findingFor(ev.proposal.fingerprint) : undefined;
                  if (!f?.box) return null;
                  const before = nameOf(scan, f.target);
                  const after = afterScan ? nameOf(afterScan, f.target) : null;
                  return (
                    <div className="before-after">
                      {before !== null && after !== null && before !== after && (
                        <p className="name-change"><span className="muted">Accessible name (approximate, from the keyboard walk)</span>
                          <span><s>{before ? `“${before}”` : "no name"}</s> becomes <strong>“{after}”</strong></span></p>
                      )}
                      <Crop scan={scan} box={f.box} label="Before" tone="before" />
                      {afterScan ? <Crop scan={afterScan} box={locate(afterScan, f.target, f.box)} label={["T2", "T4", "T5"].includes(ev?.proposal.template ?? "") ? "After, re-scanned. It looks the same: this fix is for assistive technology." : "After, re-scanned"} tone="after" /> : <p className="muted">Loading the re-scanned page…</p>}
                    </div>
                  );
                })()}
              </Verification>
            )}

            {!proposal && !result && (
              <section aria-labelledby="pick-h" className="card next">
                <h2 id="pick-h">Pick a fix</h2>
                {s.waiting.length ? (
                  <>
                    <p>Each review shows the element, why it needs you, and the exact code change.</p>
                    <button type="button" className="primary" onClick={() => s.openProposal(s.waiting[0])} disabled={busy !== null}>Review the first fix</button>
                  </>
                ) : <p className="muted">Nothing is waiting for a decision.</p>}
              </section>
            )}
          </div>
        </div>
      )}
      </div>
    </Page>
  );
}
