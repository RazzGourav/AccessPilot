import { PageHero, useReveal } from "./shared";
import { Page } from "../router";

export function HowPage() {
  useReveal();
  return (
    <Page title="Pipeline Specs">
      <PageHero app title="Architecture & Pipeline Specs" />
      <div className="wrap page-body">
        <div className="pipeline-grid">
          <section className="card" aria-labelledby="steps-h">
            <h2 id="steps-h">Execution Pipeline</h2>
            <div className="pipeline-steps">
              <div className="p-step">
                <span className="p-num">01</span>
                <div>
                  <strong>Deterministic Scan</strong>
                  <span className="muted">axe-core 4.10.2 + Playwright Chromium (30-stop keyboard walk)</span>
                </div>
              </div>
              <div className="p-step">
                <span className="p-num">02</span>
                <div>
                  <strong>AI Explanation & Proposal</strong>
                  <span className="muted">Bounded tool runner (GitHub Models / Azure OpenAI / fallback)</span>
                </div>
              </div>
              <div className="p-step">
                <span className="p-num">03</span>
                <div>
                  <strong>Human Gate</strong>
                  <span className="muted">Single-use cryptographic token + diff inspection</span>
                </div>
              </div>
              <div className="p-step">
                <span className="p-num">04</span>
                <div>
                  <strong>Automated Verification</strong>
                  <span className="muted">Ephemeral disk copy re-scan + control page regression gate</span>
                </div>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="status-h">
            <h2 id="status-h">Status State Machine</h2>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Condition</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row"><span className="status status-verified">Verified</span></th>
                  <td>Target violation resolved · 0 new serious/critical findings · Control page clean</td>
                </tr>
                <tr>
                  <th scope="row"><span className="status status-partially_verified">Partially Verified</span></th>
                  <td>Target resolved · New moderate/minor findings detected</td>
                </tr>
                <tr>
                  <th scope="row"><span className="status status-failed">Failed</span></th>
                  <td>Target remains or regression triggered on target/control page</td>
                </tr>
                <tr>
                  <th scope="row"><span className="status status-needs_human">Needs Review</span></th>
                  <td>Heuristic/contextual decision (unclear alt text, manual check)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="card" aria-labelledby="agent-h">
            <h2 id="agent-h">Agent Boundary Contract</h2>
            <div className="contract-grid">
              <div>
                <h3 className="contract-title tone-positive">Allowed Tool Capabilities</h3>
                <ul className="chip-list">
                  <li><code>inspect_findings</code></li>
                  <li><code>fetch_evidence</code></li>
                  <li><code>list_templates</code></li>
                  <li><code>draft_proposal</code></li>
                  <li><code>flag_human_review</code></li>
                </ul>
              </div>
              <div>
                <h3 className="contract-title tone-negative">Strict Prohibitions</h3>
                <ul className="chip-list">
                  <li>Apply patches</li>
                  <li>Execute bash/shell</li>
                  <li>Browse external URLs</li>
                  <li>Decide pass/fail</li>
                  <li>Read auth secrets</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="limits-h">
            <h2 id="limits-h">Operational Bounds</h2>
            <div className="limits-strip">
              <div><span className="num">8</span><span className="muted">Max model turns</span></div>
              <div><span className="num">14</span><span className="muted">Max tool calls</span></div>
              <div><span className="num">30</span><span className="muted">Max Tab stops</span></div>
              <div><span className="num">5s</span><span className="muted">Keyboard timeout</span></div>
              <div><span className="num">90s</span><span className="muted">Total execution budget</span></div>
            </div>
          </section>
        </div>
      </div>
    </Page>
  );
}
