// One outline icon set (14px, 1.75 stroke, currentColor). Icons are decorative: the words beside them
// carry the meaning, so every icon is aria-hidden (DESIGN.md §10: never colour or glyph alone).
export type IconName = "check" | "cross" | "alert" | "dot" | "ring" | "clock" | "spark" | "question" | "mark";

const PATHS: Record<IconName, JSX.Element> = {
  check: <path d="M3 8.5l3 3 7-7" />,
  cross: <path d="M4 4l8 8M12 4l-8 8" />,
  alert: <><path d="M8 4v5" /><circle cx="8" cy="12" r="0.6" fill="currentColor" /></>,
  dot: <circle cx="8" cy="8" r="3" fill="currentColor" stroke="none" />,
  ring: <circle cx="8" cy="8" r="3.5" />,
  clock: <><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.2l2 1.3" /></>,
  spark: <path d="M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3M4.3 4.3l1.9 1.9M9.8 9.8l1.9 1.9M11.7 4.3L9.8 6.2M6.2 9.8l-1.9 1.9" />,
  question: <><path d="M6.2 6.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4" /><circle cx="8" cy="12" r="0.6" fill="currentColor" /></>,
  // AccessPilot's mark: a focus ring around a check — the product's two halves, evidence and verification.
  mark: <><circle cx="8" cy="8" r="6.25" /><path d="M5.2 8.3l1.9 1.9 3.8-3.9" /></>,
};

export function Icon({ name, size = 14 }: { name: IconName; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
