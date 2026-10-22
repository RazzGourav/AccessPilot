"""Supported repair templates T1–T5 for the Golden Site (PRD §5.4, FR-20).

Each template is an exact find/replace on one allowlisted file. A template only applies when the
axe rule and target match AND the find string occurs exactly once in the working copy; otherwise the
finding is routed to human review instead of guessing.
"""
import html
import re
from dataclasses import dataclass, field

from ..errors import APIError


@dataclass(frozen=True)
class Param:
    name: str
    label: str
    default: str
    pattern: str = r"^[^<>\n]{1,150}$"
    human_edit: bool = False  # true when a person must check the wording before approval


@dataclass(frozen=True)
class Template:
    id: str
    rule_id: str
    target_pattern: str
    file: str
    find: str
    replace: str  # str.format() with escaped params
    title: str
    rationale: str
    risk: str = "low"
    params: tuple[Param, ...] = field(default_factory=tuple)

    def matches(self, rule_id: str, target: str) -> bool:
        return rule_id == self.rule_id and re.search(self.target_pattern, target) is not None

    def resolve_params(self, given: dict[str, str] | None) -> dict[str, str]:
        given = given or {}
        unknown = set(given) - {p.name for p in self.params}
        if unknown:
            raise APIError("invalid_params", f"Unknown parameter(s): {', '.join(sorted(unknown))}", 422)
        out = {}
        for p in self.params:
            value = (given.get(p.name) or p.default).strip()
            if not re.match(p.pattern, value):
                raise APIError("invalid_params", f"'{p.label}' must be 1–150 characters without < or >.", 422)
            out[p.name] = value
        return out

    def render(self, params: dict[str, str]) -> str:
        return self.replace.format(**{k: html.escape(v, quote=True) for k, v in params.items()})


TEMPLATES: dict[str, Template] = {t.id: t for t in [
    Template(
        id="T1", rule_id="label", target_pattern=r"^#email$", file="demo.html",
        find='<input type="email" id="email" name="email" autocomplete="email">',
        replace='<label for="email">{labelText}</label>\n        <input type="email" id="email" name="email" autocomplete="email">',
        title="Add a visible label bound to the email field",
        rationale="The email field has no accessible name, so screen-reader users hear only \"edit text\". "
                  "A visible <label for> gives it a name and a larger click target.",
        params=(Param("labelText", "Label text", "Email address"),),
    ),
    Template(
        id="T2", rule_id="image-alt", target_pattern=r"hero|^img$", file="demo.html",
        find='<img src="campus.svg" class="hero">',
        replace='<img src="campus.svg" class="hero" alt="{altText}">',
        title="Add a text alternative to the hero image",
        rationale="The image has no alt attribute, so screen readers may announce the file name. "
                  "The wording must describe what the image conveys — a person must confirm it.",
        params=(Param("altText", "Alt text", "Illustration of the Rungta campus main building", human_edit=True),),
    ),
    Template(
        id="T3", rule_id="color-contrast", target_pattern=r"email-help|helper", file="demo.css",
        find="color: #b4b4b4;",
        replace="color: #57606a;",
        title="Darken the helper text colour",
        rationale="Helper text #b4b4b4 on white is about 2:1, below the 4.5:1 minimum for body text. "
                  "#57606a on white is about 6.4:1.",
    ),
    Template(
        id="T4", rule_id="html-has-lang", target_pattern=r"^html$", file="demo.html",
        find="<html>",
        replace='<html lang="{lang}">',
        title="Declare the page language",
        rationale="Without a lang attribute, screen readers may read English text with the wrong pronunciation rules.",
        params=(Param("lang", "Language code", "en", pattern=r"^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$"),),
    ),
    Template(
        id="T5", rule_id="button-name", target_pattern=r"help-btn", file="demo.html",
        find='<button type="button" class="icon-btn" id="help-btn">',
        replace='<button type="button" class="icon-btn" id="help-btn" aria-label="{ariaLabel}">',
        title="Give the icon-only button an accessible name",
        rationale="The button contains only an icon hidden from assistive technology, so it is announced as \"button\" with no purpose.",
        params=(Param("ariaLabel", "Button name", "Help"),),
    ),
]}


def template_for(rule_id: str, target: str) -> Template | None:
    for t in TEMPLATES.values():
        if t.matches(rule_id, target):
            return t
    return None


def catalogue() -> list[dict]:
    return [
        {"id": t.id, "ruleId": t.rule_id, "title": t.title, "file": t.file, "risk": t.risk,
         "params": [{"name": p.name, "label": p.label, "default": p.default, "humanEdit": p.human_edit} for p in t.params]}
        for t in TEMPLATES.values()
    ]
