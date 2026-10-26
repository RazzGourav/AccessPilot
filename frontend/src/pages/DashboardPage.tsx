import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { Link, Page, useRouter } from "../router";
import { useSession } from "../session";
import { NoScan, PageHero, StatusArea } from "./shared";

export function DashboardPage() {
  const { path } = useRouter();
  const {
    scan, multiAgentRun, impact, compliance,
    runMultiAgent, fetchCompliance, fetchImpact, busy,
  } = useSession();

  const [activeTab, setActiveTab] = useState<"multiagent" | "compliance" | "impact" | "roi">(() => path === "/roi" ? "roi" : "multiagent");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [hourlyRate, setHourlyRate] = useState<number>(2500);
  const [monthlyVisitors, setMonthlyVisitors] = useState<number>(50000);
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    if (path === "/roi") setActiveTab("roi");
  }, [path]);

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
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "roi"}
                className={`tab-btn ${activeTab === "roi" ? "active" : ""}`}
                onClick={() => setActiveTab("roi")}
              >
                Business ROI & Legal Risk
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

            {/* TAB 4: Business ROI & Statutory Legal Exposure */}
            {activeTab === "roi" && (
              <div className="roi-dashboard">
                {/* Configuration Strip */}
                <div className="card mb-m" style={{ padding: "14px 18px", background: "var(--raised)" }}>
                  <div className="row spread align-center" style={{ flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <h3 className="m-0 text-m">Financial & Operational Parameters</h3>
                      <p className="muted m-0 text-xs">Tune rates and audience size to compute organization-specific business impact.</p>
                    </div>
                    <div className="row align-center gap-s" style={{ flexWrap: "wrap" }}>
                      <div className="row align-center gap-xs">
                        <label htmlFor="currency-sel" className="text-xs muted bold">Currency:</label>
                        <select
                          id="currency-sel"
                          value={currency}
                          onChange={(e) => {
                            const c = e.target.value as "INR" | "USD";
                            setCurrency(c);
                            setHourlyRate(c === "INR" ? 2500 : 75);
                          }}
                          style={{ padding: "4px 8px", fontSize: "0.85rem", borderRadius: "4px" }}
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                        </select>
                      </div>
                      <div className="row align-center gap-xs">
                        <label htmlFor="rate-inp" className="text-xs muted bold">Dev Rate / hr:</label>
                        <input
                          id="rate-inp"
                          type="number"
                          min={10}
                          max={50000}
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(Number(e.target.value) || 0)}
                          style={{ width: "90px", padding: "4px 8px", fontSize: "0.85rem", borderRadius: "4px" }}
                        />
                      </div>
                      <div className="row align-center gap-xs">
                        <label htmlFor="visitors-inp" className="text-xs muted bold">Monthly Visitors:</label>
                        <input
                          id="visitors-inp"
                          type="number"
                          min={1000}
                          step={5000}
                          value={monthlyVisitors}
                          onChange={(e) => setMonthlyVisitors(Number(e.target.value) || 0)}
                          style={{ width: "110px", padding: "4px 8px", fontSize: "0.85rem", borderRadius: "4px" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Metric Cards */}
                {(() => {
                  const estMins = impact?.estimatedRemediationMinutes || (scan.violations.length * 15);
                  const totalDevHours = Math.max(1, Math.round((estMins / 60) * 10) / 10);
                  const hoursSaved = Math.max(0.5, Math.round(totalDevHours * 0.72 * 10) / 10);
                  const moneySaved = Math.round(hoursSaved * hourlyRate);
                  const pSym = currency === "INR" ? "₹" : "$";
                  const accessibleUsers = Math.round(monthlyVisitors * 0.16);

                  const criticalCount = scan.violations.filter((v) => v.impact === "critical").length;
                  const seriousCount = scan.violations.filter((v) => v.impact === "serious").length;

                  return (
                    <>
                      <div className="grid cols-4 gap-m mb-m">
                        <div className="card" style={{ padding: "16px" }}>
                          <span className="muted text-xs bold" style={{ textTransform: "uppercase" }}>Dev Time Saved</span>
                          <div style={{ fontSize: "1.8rem", fontWeight: 700, margin: "6px 0 2px", color: "var(--primary)" }}>
                            {hoursSaved} hrs
                          </div>
                          <span className="muted text-xs">~72% manual triage & coding reduction across {scan.violations.length} findings</span>
                        </div>

                        <div className="card" style={{ padding: "16px" }}>
                          <span className="muted text-xs bold" style={{ textTransform: "uppercase" }}>Remediation Cost Saved</span>
                          <div style={{ fontSize: "1.8rem", fontWeight: 700, margin: "6px 0 2px", color: "var(--positive)" }}>
                            {pSym}{moneySaved.toLocaleString()}
                          </div>
                          <span className="muted text-xs">At {pSym}{hourlyRate.toLocaleString()}/hr engineering cost</span>
                        </div>

                        <div className="card" style={{ padding: "16px" }}>
                          <span className="muted text-xs bold" style={{ textTransform: "uppercase" }}>Statutory Penalty Shield</span>
                          <div style={{ fontSize: "1.4rem", fontWeight: 700, margin: "8px 0 2px", color: criticalCount > 0 ? "var(--negative)" : seriousCount > 0 ? "var(--warning)" : "var(--primary)" }}>
                            {criticalCount > 0 ? "High Exposure" : seriousCount > 0 ? "Moderate Exposure" : "Low Exposure"}
                          </div>
                          <span className="muted text-xs">RPwD Act up to ₹5L / ADA up to $150K</span>
                        </div>

                        <div className="card" style={{ padding: "16px" }}>
                          <span className="muted text-xs bold" style={{ textTransform: "uppercase" }}>Accessible Audience</span>
                          <div style={{ fontSize: "1.8rem", fontWeight: 700, margin: "6px 0 2px", color: "var(--accent)" }}>
                            {accessibleUsers.toLocaleString()}+
                          </div>
                          <span className="muted text-xs">~16% of monthly traffic experiencing functional limitations</span>
                        </div>
                      </div>

                      {/* Statutory Legal Exposure Breakdown */}
                      <div className="card mb-m" style={{ padding: "18px 20px" }}>
                        <h3 className="m-0 text-m mb-xs">Statutory Legal Risk Exposure Matrix</h3>
                        <p className="muted text-s mb-m">Direct mapping to active accessibility civil & administrative statutes.</p>

                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                            <thead>
                              <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                                <th style={{ padding: "8px 12px" }}>Jurisdiction & Statute</th>
                                <th style={{ padding: "8px 12px" }}>Legal Mandate</th>
                                <th style={{ padding: "8px 12px" }}>Civil / Regulatory Penalty</th>
                                <th style={{ padding: "8px 12px" }}>Identified Trigger in Scan</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "10px 12px", fontWeight: 600 }}>India: RPwD Act 2016 (Sec 40, 46, 89)</td>
                                <td style={{ padding: "10px 12px" }}>Mandatory accessibility for all digital public & private service providers</td>
                                <td style={{ padding: "10px 12px", color: "var(--negative)" }}>₹10,000 (first offence), up to ₹5,00,000 (subsequent)</td>
                                <td style={{ padding: "10px 12px" }}>{scan.violations.length} barriers impeding autonomous access</td>
                              </tr>
                              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "10px 12px", fontWeight: 600 }}>European Accessibility Act (EAA 2025)</td>
                                <td style={{ padding: "10px 12px" }}>Mandatory for e-commerce, banking, consumer software operating in EU</td>
                                <td style={{ padding: "10px 12px", color: "var(--negative)" }}>Fines up to €100,000+ and market service ban</td>
                                <td style={{ padding: "10px 12px" }}>{criticalCount} critical interaction and form input barriers</td>
                              </tr>
                              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "10px 12px", fontWeight: 600 }}>US: ADA Title III & Section 508</td>
                                <td style={{ padding: "10px 12px" }}>Places of public accommodation digital non-discrimination</td>
                                <td style={{ padding: "10px 12px", color: "var(--warning)" }}>$75,000–$150,000 settlement range + legal defense fees</td>
                                <td style={{ padding: "10px 12px" }}>Color contrast, missing alternative text, keyboard barriers</td>
                              </tr>
                              <tr>
                                <td style={{ padding: "10px 12px", fontWeight: 600 }}>India: GIGW 3.0 & IS 17802:2021</td>
                                <td style={{ padding: "10px 12px" }}>National standard for public sector and enterprise ICT systems</td>
                                <td style={{ padding: "10px 12px", color: "var(--muted)" }}>Tender disqualification & compliance audit notices</td>
                                <td style={{ padding: "10px 12px" }}>Language declaration, landmark structure, skip navigation</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Executive Leadership Summary */}
                      <div className="card" style={{ padding: "18px 20px", background: "var(--surface)" }}>
                        <div className="row spread align-center mb-s">
                          <div>
                            <h3 className="m-0 text-m">Executive Accessibility Briefing</h3>
                            <span className="muted text-xs">For Chief Technology Officer, Head of Product, and Legal Counsel</span>
                          </div>
                          <button
                            type="button"
                            className="chip"
                            onClick={() => {
                              const summary = `AccessPilot Accessibility Briefing for ${scan.title || scan.finalUrl}\n` +
                                `Total Barriers Detected: ${scan.violations.length} (${criticalCount} critical, ${seriousCount} serious)\n` +
                                `Estimated Engineering Triage Time: ${totalDevHours} hours\n` +
                                `Automated Time Savings: ~${hoursSaved} hours (${pSym}${moneySaved.toLocaleString()} saved at ${pSym}${hourlyRate}/hr)\n` +
                                `Potentially Affected Audience: ~${accessibleUsers.toLocaleString()} monthly visitors with functional limitations\n` +
                                `Statutory Risk: India RPwD Act 2016 (Sec 89), EAA 2025, and ADA Title III exposure.\n` +
                                `Recommendation: Review prioritized repair proposals in AccessPilot and verify fixes via deterministic re-testing.`;
                              navigator.clipboard.writeText(summary);
                              setCopiedSummary(true);
                              setTimeout(() => setCopiedSummary(false), 2000);
                            }}
                          >
                            {copiedSummary ? "Briefing Copied!" : "Copy Briefing to Clipboard"}
                          </button>
                        </div>
                        <div style={{ background: "var(--raised)", padding: "12px 16px", borderRadius: "6px", fontSize: "0.88rem", lineHeight: 1.6 }}>
                          <p style={{ margin: "0 0 8px" }}>
                            A deterministic accessibility scan of <strong>{scan.title || scan.finalUrl}</strong> identified <strong>{scan.violations.length} total accessibility barriers</strong>, including {criticalCount} critical and {seriousCount} serious issues.
                          </p>
                          <p style={{ margin: "0 0 8px" }}>
                            Resolving these barriers with AccessPilot's guided agent and verified repair templates saves an estimated <strong>{hoursSaved} engineering hours</strong> ({pSym}{moneySaved.toLocaleString()} in developer labor costs) while expanding digital reach to an estimated <strong>{accessibleUsers.toLocaleString()}+ visitors</strong> experiencing vision, motor, or cognitive impairments.
                          </p>
                          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.82rem" }}>
                            <em>Note: Calculations are heuristic business estimates based on empirical industry benchmarks. Automated scans verify deterministic rules and do not substitute for comprehensive human auditing or formal legal counsel.</em>
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}
