import { PageHero } from "./shared";
import { Page } from "../router";

// Facts on this page must stay true: update the date and results whenever the self-audit is re-run.
export function A11yPage() {
  return (
    <Page title="Accessibility statement">
      <PageHero title="Accessibility statement" lede="An accessibility tool has to be usable by the people it is meant to help. This is what we aim for, how we checked it, and where it still falls short." />
      <div className="wrap page-body">

      <div className="prose-layout">
      <aside className="toc card glance" aria-labelledby="glance-h">
        <h2 id="glance-h">At a glance</h2>
        <dl>
          <dt>Target</dt><dd>WCAG 2.2, level AA</dd>
          <dt>Conformance claimed</dt><dd>None yet (no independent audit)</dd>
          <dt>Last checked</dt><dd>20 October 2026</dd>
          <dt>Automated audit</dt><dd>No serious or critical issues, light and dark</dd>
          <dt>Screen readers</dt><dd>Not yet tested</dd>
        </dl>
      </aside>
      <article className="prose">
        <section aria-labelledby="target-h">
          <h2 id="target-h">Our target</h2>
          <p>We aim for the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA across every page of AccessPilot. We have not had an independent audit, so we do not claim conformance.</p>
        </section>

        <section aria-labelledby="tested-h">
          <h2 id="tested-h">How we tested it</h2>
          <p>Last checked on 20 October 2026, on Windows 11 in Chromium.</p>
          <ul>
            <li>An automated audit drives the whole flow with the keyboard only: scan, run the agent, review a fix, approve it and read the verification. It runs axe-core at each step, in light and dark themes. The latest run found no serious or critical issues.</li>
            <li>The design was checked at 1440, 768 and 390 pixels wide for reflow, overlap and text against the screen edge.</li>
            <li>Every page's text was checked for contrast of at least 4.5:1 in both themes.</li>
          </ul>
          <p>We have <strong>not</strong> yet tested with screen readers (NVDA, JAWS, VoiceOver, TalkBack), with voice control, or with disabled users. Those come next.</p>
        </section>

        <section aria-labelledby="features-h">
          <h2 id="features-h">What you can expect</h2>
          <ul>
            <li>A skip link, one main heading per page, and headings in order.</li>
            <li>Everything works with a keyboard, with a visible focus outline.</li>
            <li>When you move between pages, focus goes to the new page's heading and the change is announced.</li>
            <li>Status, impact and results are written in words, never shown by colour alone.</li>
            <li>Progress and results are announced through a polite live region; errors use an alert.</li>
            <li>Light and dark themes, and no movement if your system asks for reduced motion.</li>
            <li>Text reflows at 320 pixels wide without horizontal scrolling of the page.</li>
          </ul>
        </section>

        <section aria-labelledby="limits-h">
          <h2 id="limits-h">Known limitations</h2>
          <ul>
            <li><strong>Page view overlays are visual.</strong> The numbered markers are buttons with full names, but the tab path drawing is not described step by step. The same information is in the Findings list and the Keyboard focus path list.</li>
            <li><strong>Captured screenshots</strong> of scanned pages have a short text description, not a full description of the page.</li>
            <li><strong>Code diffs</strong> are shown as plain text; long lines wrap, which can make them harder to follow with a screen magnifier.</li>
            <li><strong>Scanned pages</strong> may contain barriers of their own. Those belong to the page, and AccessPilot reports them.</li>
          </ul>
        </section>

        <section aria-labelledby="feedback-h">
          <h2 id="feedback-h">Tell us about a barrier</h2>
          <p>If something in AccessPilot does not work for you, tell the team at the event desk or open an issue in the project repository. Please say which page, what you were trying to do, and what you use (browser, screen reader, magnifier or voice control).</p>
        </section>
      </article>
      </div>
      </div>
    </Page>
  );
}
