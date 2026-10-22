// A minimal History-API router (no dependency). Accessible route changes: each page sets the
// document title, focus moves to the page's h1, and a polite live region announces the new page —
// what a screen-reader user would otherwise miss in a single-page app.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const ROUTES = {
  "/": "Home",
  "/how-it-works": "How it works",
  "/audit": "Audit",
  "/findings": "Findings",
  "/repairs": "Repairs",
  "/experience": "Lived Experience",
  "/dashboard": "Impact & Compliance",
  "/report": "Report",
  "/accessibility": "Accessibility statement",
} as const;
export type Path = keyof typeof ROUTES;

const isRoute = (p: string): p is Path => p in ROUTES;

interface RouterValue { path: Path; hash: string; navigate: (to: string) => void }
const RouterContext = createContext<RouterValue>({ path: "/", hash: "", navigate: () => undefined });

function read(): { path: Path; hash: string } {
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  return { path: isRoute(p) ? p : "/", hash: window.location.hash.slice(1) };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const onPop = () => setLoc(read());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (to: string) => {
    if (to === window.location.pathname + window.location.hash) return;
    window.history.pushState(null, "", to);
    setLoc(read());
  };
  return <RouterContext.Provider value={{ ...loc, navigate }}>{children}</RouterContext.Provider>;
}

export const useRouter = () => useContext(RouterContext);

/** A real <a href> (works without script, opens in a new tab, is announced as a link). */
export function Link({ to, children, className, current }: { to: string; children: ReactNode; className?: string; current?: boolean }) {
  const { navigate } = useRouter();
  return (
    <a href={to} className={className} aria-current={current ? "page" : undefined}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
      }}>
      {children}
    </a>
  );
}

let firstPage = true; // on the initial load focus stays at the top of the document, before the skip link

/** Wraps each page: title, focus to h1 on arrival, scroll to top or to the #hash target. */
export function Page({ title, children }: { title: string; children: ReactNode }) {
  const { path, hash } = useRouter();
  useEffect(() => {
    document.title = `${title} · AccessPilot`;
    if (firstPage && !hash) { firstPage = false; return; }
    firstPage = false;
    const announcer = document.getElementById("route-announcer");
    if (announcer) announcer.textContent = `${title} page`;
    requestAnimationFrame(() => {
      const target = hash ? document.getElementById(hash) : null;
      if (target) {
        target.scrollIntoView({ block: "center" });
        target.focus({ preventScroll: true });
      } else {
        window.scrollTo(0, 0);
        document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
      }
    });
  }, [path, hash, title]);
  return <>{children}</>;
}
