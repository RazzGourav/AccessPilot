"""Honest coverage panel (FR-07, FR-17). Describes what ran — never a score or a compliance claim."""
from . import config
from .models import Coverage

NOT_TESTED = [
    "Real screen-reader output (NVDA, JAWS, VoiceOver) — the focus list is an approximation",
    "Whether a user can complete the whole task end to end",
    "Whether alt text and link text are meaningful in context",
    "Zoom to 200% and reflow at 320 CSS px",
    "Reading order and meaning of content",
    "Keyboard traps inside complex widgets (only a bounded heuristic walk ran)",
    "Captions, audio and video content",
    "Pages other than the one scanned",
]

LIMITATIONS = [
    "Automated rules cover only part of WCAG; many success criteria need human judgement.",
    "The keyboard path is a heuristic: it records up to 30 Tab stops and does not prove every control is operable.",
    "AI explanations are advice. Only a deterministic re-test can mark a repair as verified.",
    "This is not a compliance certificate or legal advice.",
]


def build(scanner_version: str, violations: int, incomplete: int, passes: int, keyboard_stops: int) -> Coverage:
    return Coverage(
        scanner="axe-core",
        scannerVersion=scanner_version,
        tags=list(config.AXE_TAGS),
        violations=violations,
        incomplete=incomplete,
        passes=passes,
        keyboardStops=keyboard_stops,
        methods=[
            "axe-core automated rules in headless Chromium (Playwright)",
            f"Bounded keyboard walk (up to {config.KEYBOARD_LIMIT} Tab stops)",
            "Clickable-but-not-focusable heuristic",
        ],
        notTested=list(NOT_TESTED),
    )
