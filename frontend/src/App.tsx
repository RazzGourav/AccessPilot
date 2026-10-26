// The site shell: skip link, header navigation, the routed page, and the footer.
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { A11yPage } from "./pages/A11yPage";
import { AuditPage } from "./pages/AuditPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExperiencePage } from "./pages/ExperiencePage";
import { FindingsPage } from "./pages/FindingsPage";
import { HomePage } from "./pages/HomePage";
import { HowPage } from "./pages/HowPage";
import { RepairsPage } from "./pages/RepairsPage";
import { ReportPage } from "./pages/ReportPage";
import { Link, RouterProvider, useRouter, type Path } from "./router";
import { SessionProvider, useSession } from "./session";
import { ThemeSwitch } from "./theme";

const PAGES: Record<Path, () => JSX.Element> = {
  "/": HomePage,
  "/how-it-works": HowPage,
  "/audit": AuditPage,
  "/findings": FindingsPage,
  "/repairs": RepairsPage,
  "/experience": ExperiencePage,
  "/dashboard": DashboardPage,
  "/roi": DashboardPage,
  "/report": ReportPage,
  "/accessibility": A11yPage,
};

function Nav() {
  const { path } = useRouter();
  const { scan, waiting, health } = useSession();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const items: [Path, string, string | null][] = [
    ["/how-it-works", "How it works", null],
    ["/audit", "Audit", null],
    ["/findings", "Findings", scan ? String(scan.violations.length) : null],
    ["/repairs", "Repairs", waiting.length ? `${waiting.length} waiting` : null],
    ["/experience", "Experience", null],
    ["/dashboard", "Impact & ROI", null],
    ["/report", "Report", null],
  ];
  return (
    <header className="top">
      <div className="wrap top-row">
        <Link to="/" className="logo" current={path === "/"}><span className="logo-mark"><Icon name="mark" size={22} /></span>AccessPilot</Link>
        <button type="button" className="menu-btn" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>
          {open ? "Close menu" : "Menu"}
        </button>
        <nav id="site-nav" aria-label="Main" className={open ? "open" : ""}>
          <ul>
            {items.map(([to, label, count]) => (
              <li key={to}>
                <Link to={to} current={path === to}>
                  {label}{count && <span className="nav-count">{count}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="top-tools">
          {health && (
            <p className={`ai-chip${health.ai.configured ? " live" : ""}`}>
              <span className="ai-dot" aria-hidden="true" />
              {health.ai.configured ? `Agent: ${health.ai.model}` : "Agent: built-in guidance"}
            </p>
          )}
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
}

function Routed() {
  const { path } = useRouter();
  const Current = PAGES[path];
  return <Current />;
}

export default function App() {
  return (
    <RouterProvider>
      <SessionProvider>
        <a className="skip" href="#main">Skip to main content</a>
        <Nav />
        <main id="main" className="site-main" tabIndex={-1}>
          <Routed />
        </main>
        <footer className="site-foot">
          <div className="wrap foot-row">
            <p className="foot-brand">AccessPilot, the accessibility fixer that proves its fixes</p>
            <nav aria-label="Footer">
              <ul>
                <li><Link to="/how-it-works">How it works</Link></li>
                <li><Link to="/audit">Audit</Link></li>
                <li><Link to="/accessibility">Accessibility statement</Link></li>
              </ul>
            </nav>
            <p className="foot-end">2026 · Not a compliance certificate</p>
          </div>
        </footer>
        <div id="route-announcer" className="sr-only" aria-live="polite" aria-atomic="true" />
      </SessionProvider>
    </RouterProvider>
  );
}
