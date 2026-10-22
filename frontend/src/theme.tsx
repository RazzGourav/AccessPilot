// Light / Dark switch. Light is the default; the choice is a per-viewer convenience kept in
// localStorage (wrapped in try/catch: storage can be blocked, and the page must still work).
import { useState } from "react";

type Theme = "light" | "dark";
const KEY = "accesspilot-theme";

function current(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(current);
  function choose(t: Theme) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(KEY, t); } catch { /* not persisted; still applied */ }
    setTheme(t);
  }
  return (
    <div className="seg seg-small" role="group" aria-label="Colour theme">
      <button type="button" aria-pressed={theme === "light"} onClick={() => choose("light")}>Light</button>
      <button type="button" aria-pressed={theme === "dark"} onClick={() => choose("dark")}>Dark</button>
    </div>
  );
}
