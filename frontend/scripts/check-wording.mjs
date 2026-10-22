// FR-17 / US-03: the UI must never show a score or claim compliance. Scans every file under src/.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const banned = [/\bscore\b/i, /\bcompliant\b/i, /100%\s*accessible/i, /fully accessible/i, /WCAG certified/i];
const root = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else yield p;
  }
}

let bad = 0;
for (const file of files(root)) {
  const text = readFileSync(file, "utf8");
  for (const re of banned) {
    const m = text.match(re);
    if (m) { console.error(`${relative(root, file)}: banned wording "${m[0]}"`); bad++; }
  }
}
if (bad) process.exit(1);
console.log("UI wording check passed: no score or compliance claims.");
