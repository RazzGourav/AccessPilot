import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { Link, Page } from "../router";
import { useSession } from "../session";
import { NoScan, PageHero, StatusArea } from "./shared";

export function DashboardPage() {
  const {
    scan, multiAgentRun, impact, compliance,
    runMultiAgent, fetchCompliance, fetchImpact, busy,
  } = useSession();

  const [activeTab, setActiveTab] = useState<"multiagent" | "compliance" | "impact">("multiagent");

  useEffect(() => {
    if (scan) {
      if (compliance.length === 0) fetchCompliance();
      if (!impact) fetchImpact();
    }
  }, [scan]);

  return (
    <Page title="Impact & Compliance Dashboard">
      <PageHero
        title="Impact & Compliance Dashboard"
        lede="Multi-agent orchestration, demographic barrier analysis, and India statutory frameworks (RPwD Act 2016, GIGW 3.0, IS 17802)."
        app
      />

      <div className="wrap app-grid">
        <StatusArea />

        {!scan ? (
          <NoScan what="Impact and compliance analytics" />
        ) : (
          <div className="dash-container">
            {/* Multi-Agent Orchestration Card */}
            <div className="card dash-hero-card mb-m">
              <div className="row spread align-center">
                <div>
                  <h2 className="m-0 text-l">Specialist Multi-Agent System</h2>
                  <p className="muted m-0 text-s">
                    Coordinator Agent orchestrates Scanner, Impact Analyzer, Real-User Simulator, Compliance Lawyer, and Code Fixer.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn primary"
                  disabled={busy !== null}
                  onClick={() => runMultiAgent()}
                >
                  <Icon name="dot" size={12} />
                  {busy === "multiAgent" ? "Agents Orchestrating…" : "Run Multi-Agent Intelligence"}
                </button>
              </div>

              {multiAgentRun && (
                <div className="dash-coordinator-box mt-m">
                  <div className="row align-center gap-s mb-xs">
                    <span className="tag primary-tag">Coordinator Decision</span>
                    <span className="muted text-xs">Autonomous Triage</span>
                  </div>
                  <p className="coordinator-text">{multiAgentRun.coordinatorDecision}</p>
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="tab-bar mb-m" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "multiagent"}
                className={`tab-btn ${activeTab === "multiagent" ? "active" : ""}`}
                onClick={() => setActiveTab("multiagent")}
              >
                Multi-Agent Workflow {multiAgentRun && `(${multiAgentRun.activities.length})`}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "compliance"}
                className={`tab-btn ${activeTab === "compliance" ? "active" : ""}`}
                onClick={() => setActiveTab("compliance")}
              >
                India Statutory Standards {compliance.length > 0 && `(${compliance.length})`}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "impact"}
                className={`tab-btn ${activeTab === "impact" ? "active" : ""}`}
                onClick={() => setActiveTab("impact")}
              >
                Demographic Impact & Effort
              </button>
            </div>

            {/* TAB 1: Multi-Agent Activities */}
            {activeTab === "multiagent" && (
              <div className="card">
                <div className="row spread align-center mb-m">
                  <h3 className="m-0 text-m">Agent Team Activity Stream</h3>
                  <span className="muted text-s">Chronological agent task records</span>
                </div>

                {!multiAgentRun ? (
                  <div className="empty-subpanel text-center py-l">
                    <p className="muted">Multi-agent intelligence has not been run for this scan yet.</p>
                    <button
                      type="button"
                      className="btn secondary small"
                      onClick={() => runMultiAgent()}
                      disabled={busy !== null}
                    >
                      Launch Coordinator & Specialists
                    </button>
                  </div>
                ) : (
                  <div className="activity-timeline">
                    {multiAgentRun.activities.map((act, i) => (
                      <div key={i} className="activity-row">
                        <div className="activity-badge">
                          <Icon name="check" size={14} />
                        </div>
                        <div className="activity-content">
                          <div className="row spread align-center">
                            <strong className="activity-agent">{act.specialist}</strong>
                            <span className="muted text-xs">{act.timestamp.slice(11, 19)} UTC</span>
                          </div>
                          <div className="activity-action text-s bold mt-xs">{act.action}</div>
                          <p className="activity-detail muted text-s mt-xs">{act.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: India Statutory Compliance */}
            {activeTab === "compliance" && (
              <div className="card">
                <div className="row spread align-center mb-m">
                  <div>
                    <h3 className="m-0 text-m">India Statutory Accessibility Frameworks</h3>
                    <p className="muted text-s m-0">
                      Mapped against Rights of Persons with Disabilities (RPwD) Act 2016, GIGW 3.0, and BIS IS 17802.
                    </p>
                  </div>
                  {impact && (
                    <span className={`tag exposure-${impact.legalExposureLevel}`}>
                      Exposure: {impact.legalExposureLevel.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="compliance-grid">
                  {compliance.map((item, idx) => (
                    <article key={idx} className="card compliance-card">
                      <div className="row spread align-center mb-s">
                        <code>{item.ruleId}</code>
                        <span className={`tag priority-${item.statutoryPriority}`}>
                          {item.statutoryPriority.toUpperCase()}
                        </span>
                      </div>

                      <div className="statutory-refs mb-s">
                        <div className="ref-item">
                          <span className="ref-label bold text-xs">RPwD Act 2016:</span>
                          <span className="ref-val text-s">{item.rpwdSection}</span>
                        </div>
                        <div className="ref-item">
                          <span className="ref-label bold text-xs">GIGW 3.0:</span>
                          <span className="ref-val text-s">{item.gigwClause}</span>
                        </div>
                        <div className="ref-item">
                          <span className="ref-label bold text-xs">IS 17802:</span>
                          <span className="ref-val text-s">{item.is17802Clause}</span>
                        </div>
                      </div>

                      <p className="text-s muted mb-s">{item.statutoryNote}</p>
                      <div className="row spread align-center border-t pt-xs">
                        <code className="text-xs muted">{item.target.slice(0, 45)}</code>
                        <Link to={`/findings#${item.fingerprint}`} className="btn small secondary">
                          Inspect finding
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Demographic Impact & Developer Effort */}
            {activeTab === "impact" && impact && (
              <div className="grid cols-2 gap-m">
                {/* Demographic Reach */}
                <div className="card">
                  <h3 className="m-0 text-m mb-xs">Assisted User Groups Affected</h3>
                  <p className="muted text-s mb-m">Barriers categorized by assistive technology user cohorts.</p>

                  <div className="demographic-bars">
                    {Object.entries(impact.affectedUserGroups).map(([group, count]) => {
                      const max = Math.max(...Object.values(impact.affectedUserGroups), 1);
                      const pct = Math.round((count / max) * 100);
                      return (
                        <div key={group} className="demo-bar-item mb-m">
                          <div className="row spread text-s mb-xs">
                            <span className="bold capitalize">{group} Disabilities</span>
                            <span className="muted">{count} barrier references</span>
                          </div>
                          <div className="progress-track" aria-hidden="true">
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Developer Remediation Effort */}
                <div className="card">
                  <h3 className="m-0 text-m mb-xs">Remediation Effort Estimates</h3>
                  <p className="muted text-s mb-m">Deterministic developer work estimation based on finding types.</p>

                  <div className="metric-box mb-m">
                    <span className="metric-label muted">Estimated Engineering Time</span>
                    <span className="metric-val text-info">
                      {Math.floor(impact.estimatedRemediationMinutes / 60)}h {impact.estimatedRemediationMinutes % 60}m
                    </span>
                    <p className="muted text-xs mt-xs">
                      Across {impact.totalBarriers} total barriers in scanned scope.
                    </p>
                  </div>

                  <h4 className="text-s bold mb-s">Top Barriers by Frequency</h4>
                  <ul className="clean-list">
                    {impact.topBarriers.map((tb, idx) => (
                      <li key={idx} className="row spread py-xs border-b">
                        <code>{tb.ruleId}</code>
                        <span className="tag muted">{tb.count} occurrence(s)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}
