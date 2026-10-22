"""Assistive technology and user experience simulator.

Emulates screen reader speech output (NVDA, JAWS, TalkBack style) and
calculates interaction frustration metrics from keyboard walk signals and DOM evidence.

Complies strictly with Rule 6: no scores, no percentages, no compliance claims.
"""
from typing import Optional

from .models import Box, ExperienceSimulation, FocusStop, FrustrationMetrics, Scan, ScreenReaderFrame


def generate_speech_text(stop: FocusStop, violation_rules: set[str]) -> str:
    """Generate realistic screen reader announcement for a focus stop."""
    role = stop.role.lower() if stop.role else stop.tag.lower()
    name = (stop.name or "").strip()
    
    if not name:
        if "label" in violation_rules or "button-name" in violation_rules:
            return f"Unlabeled {role}"
        if stop.tag == "input":
            return f"Edit text, blank"
        if stop.tag == "button":
            return "Button, unnamed"
        return f"{role}, unannounced"

    if stop.tag == "a" or role == "link":
        if name.lower() in {"click here", "read more", "more", "link"}:
            return f"Link, {name}. Warning: Ambiguous destination."
        return f"Link, {name}"

    if stop.tag == "button" or role == "button":
        return f"Button, {name}"

    if stop.tag in {"input", "textarea"}:
        return f"Edit text, {name}"

    if stop.tag == "select" or role == "combobox":
        return f"Combo box, {name}"

    return f"{role.capitalize()}, {name}"


def simulate_experience(scan: Scan) -> ExperienceSimulation:
    """Simulate screen reader stream and keyboard navigation frustration."""
    frames: list[ScreenReaderFrame] = []
    
    # Map targets/rules for rapid lookup
    violation_rules_by_target: dict[str, set[str]] = {}
    for v in scan.violations:
        target = v.target.strip()
        if target not in violation_rules_by_target:
            violation_rules_by_target[target] = set()
        violation_rules_by_target[target].add(v.ruleId)

    steps = scan.keyboardWalk.steps
    repeated_count = 0
    missing_name_count = 0
    stuck_points = 0
    tab_order_jumps = 0

    for i, stop in enumerate(steps):
        rules = violation_rules_by_target.get(stop.selector.strip(), set())
        speech = generate_speech_text(stop, rules)
        
        state_parts = []
        if stop.repeated:
            repeated_count += 1
            state_parts.append("repeated focus")
        if not stop.name.strip() and stop.tag in {"input", "button", "a", "select"}:
            missing_name_count += 1
            state_parts.append("missing label")
            
        # Detect large coordinate jumps in tab order
        if i > 0 and stop.box and steps[i - 1].box:
            prev_box = steps[i - 1].box
            # If tabbing backwards vertically by more than 200px without wrapping
            if (stop.box.y - prev_box.y) < -250:
                tab_order_jumps += 1
                state_parts.append("order jump")

        frames.append(ScreenReaderFrame(
            order=stop.order,
            role=stop.role or stop.tag,
            name=stop.name or "unnamed",
            speechText=speech,
            selector=stop.selector,
            state=", ".join(state_parts),
            box=stop.box,
        ))

    # Evaluate stuck points and frustration rating
    if scan.keyboardWalk.endedReason in {"repeated_focus_cycle", "limit_reached"}:
        stuck_points += 1
    if any(v.ruleId == "keyboard-trap" for v in scan.violations):
        stuck_points += 1

    if stuck_points > 0 or repeated_count > 3:
        frustration_rating = "severe" if stuck_points > 1 else "high"
        summary = (f"Navigation trapped or cyclical. Detected {stuck_points} stuck point(s) "
                   f"and {repeated_count} repeated stop(s) obstructing keyboard flow.")
    elif missing_name_count > 2 or tab_order_jumps > 1:
        frustration_rating = "moderate"
        summary = (f"Assistive disorientation detected: {missing_name_count} unlabeled control(s) "
                   f"and {tab_order_jumps} unexpected focus jump(s).")
    elif missing_name_count > 0 or len(scan.violations) > 0:
        frustration_rating = "low"
        summary = f"Minor friction: {missing_name_count} control(s) lack accessible names."
    else:
        frustration_rating = "low"
        summary = "Smooth linear keyboard navigation path observed across tested stops."

    metrics = FrustrationMetrics(
        stuckPoints=stuck_points,
        repeatedFocusStops=repeated_count,
        missingAccessibleNames=missing_name_count,
        tabOrderJumps=tab_order_jumps,
        frustrationRating=frustration_rating,
        summary=summary,
    )

    return ExperienceSimulation(
        scanId=scan.scanId,
        screenReaderLog=frames,
        frustration=metrics,
        keyboardPathLength=len(steps),
    )
