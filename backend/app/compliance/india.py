"""Deterministic mapping of accessibility findings to Indian statutory and technical standards.

Covers:
- Rights of Persons with Disabilities (RPwD) Act 2016 (Sections 42 and 46)
- Guidelines for Indian Government Websites (GIGW 3.0, 2023)
- Bureau of Indian Standards IS 17802 (Part 1 & 2: Accessibility for ICT Products and Services)

IMPORTANT: AGENTS.md Rule 6 prohibits false claims, scores, percentages, and statements of compliance.
This module provides factual, deterministic mapping between rule identifiers and statutory provisions.
"""
from typing import Optional

# Mapping table from axe / heuristic ruleId to Indian statutory provisions.
# Factual citations only; no claims of certification or compliance.
RULE_INDIA_MAPPINGS: dict[str, dict[str, str]] = {
    "image-alt": {
        "rpwd_section": "Section 42 (Rules for access to ICT)",
        "gigw_clause": "GIGW 3.0 Clause 6.2.1 (Non-text Content)",
        "is_17802_clause": "IS 17802 Part 1 Cl. 9.1.1.1 (Alternative text for visual elements)",
        "statutory_note": "Mandates text equivalents for non-text content to ensure barrier-free digital access for persons with visual disabilities.",
        "statutory_priority": "high",
    },
    "color-contrast": {
        "rpwd_section": "Section 42 (Accessible electronic media)",
        "gigw_clause": "GIGW 3.0 Clause 6.4.1 (Visual Presentation & Contrast)",
        "is_17802_clause": "IS 17802 Part 1 Cl. 9.1.4.3 (Contrast Minimum: 4.5:1 text, 3:1 UI)",
        "statutory_note": "Ensures visual readability for individuals with low vision, color perception deficiencies, or aging-related visual decline.",
        "statutory_priority": "high",
    },
    "label": {
        "rpwd_section": "Section 42 (Accessible user interfaces)",
        "gigw_clause": "GIGW 3.0 Clause 6.3.3 (Form Controls and Accessible Labels)",
        "is_17802_clause": "IS 17802 Part 1 Cl. 9.3.3.2 (Labels or instructions for form inputs)",
        "statutory_note": "Requires explicit programmatic labels for interactive form inputs so assistive technologies can announce their purpose.",
        "statutory_priority": "high",
    },
    "html-has-lang": {
        "rpwd_section": "Section 42 (ICT accessibility standards)",
        "gigw_clause": "GIGW 3.0 Clause 6.6.1 (Language of Page)",
        "is_17802_clause": "IS 17802 Part 1 Cl. 9.3.1.1 (Primary natural language definition)",
        "statutory_note": "Enables multi-lingual text-to-speech synthesizers (e.g. Indic speech engines) to select correct pronunciation rules.",
        "statutory_priority": "medium",
    },
    "heading-order": {
        "rpwd_section": "Section 42 (Logical structure and navigation)",
        "gigw_clause": "GIGW 3.0 Clause 6.3.1 (Information and Structural Relationships)",
        "is_17802_clause": "IS 17802 Part 1 Cl. 9.1.3.1 (Info and Relationships hierarchy)",
        "statutory_note": "Provides structured document outline essential for screen reader heading navigation and cognitive orientation.",
        "statutory_priority": "medium",
    },
    "keyboard-trap": {
        "rpwd_section": "Section 42 & Section 46 (Barrier-free access to electronic services)",
        "gigw_clause": "GIGW 3.0 Clause 6.5.2 (No Keyboard Trap)",
        "is_17802_clause": "IS 17802 Part 1 Cl. 9.2.1.2 (Keyboard Navigation without Trapping)",
        "statutory_note": "Critical operational barrier preventing keyboard-only users and switch-device users from exiting interactive elements.",
        "statutory_priority": "critical",
    },
    "link-name": {
        "rpwd_section": "Section 42 (Accessible navigation mechanisms)",
        "gigw_clause": "GIGW 3.0 Clause 6.2.4 (Link Purpose and Clear Context)",
        "is_17802_clause": "IS 17802 Part 1 Cl. 9.2.4.4 (Identifiable Link Purpose in context)",
        "statutory_note": "Ensures links announced out of context in assistive link lists communicate destination or action unambiguously.",
        "statutory_priority": "high",
    },
    "button-name": {
        "rpwd_section": "Section 42 (Accessible interactive controls)",
        "gigw_clause": "GIGW 3.0 Clause 6.2.4 (Control Identification)",
        "is_17802_clause": "IS 17802 Part 1 Cl. 9.4.1.2 (Name, Role, and Value of interactive widgets)",
        "statutory_note": "Guarantees buttons have accessible names readable by speech synthesizers and braille displays.",
        "statutory_priority": "high",
    },
    "aria-allowed-attr": {
        "rpwd_section": "Section 42 (Standards for accessibility)",
        "gigw_clause": "GIGW 3.0 Clause 6.8.1 (ARIA Implementation)",
        "is_17802_clause": "IS 17802 Part 1 Cl. 9.4.1.2 (Robust Name, Role, Value)",
        "statutory_note": "Prevents malformed accessibility semantics that confuse assistive technologies.",
        "statutory_priority": "medium",
    },
    "document-title": {
        "rpwd_section": "Section 42 (Accessible electronic documents)",
        "gigw_clause": "GIGW 3.0 Clause 6.2.3 (Page Titles)",
        "is_17802_clause": "IS 17802 Part 1 Cl. 9.2.4.2 (Titled Web Pages)",
        "statutory_note": "Enables users with disabilities to orient themselves across open tabs, applications, and documents.",
        "statutory_priority": "medium",
    },
    "bypass": {
        "rpwd_section": "Section 42 (Efficient navigation for disabled persons)",
        "gigw_clause": "GIGW 3.0 Clause 6.5.1 (Bypass Blocks / Skip to Content)",
        "is_17802_clause": "IS 17802 Part 1 Cl. 9.2.4.1 (Mechanism to bypass repeated blocks)",
        "statutory_note": "Allows keyboard and screen reader users to skip repeated navigation headers and jump directly to main content.",
        "statutory_priority": "high",
    },
}

DEFAULT_INDIA_MAPPING = {
    "rpwd_section": "Section 42 (Rights of Persons with Disabilities Act 2016)",
    "gigw_clause": "GIGW 3.0 Section 6 (Accessibility Requirements)",
    "is_17802_clause": "IS 17802 Part 1 (Accessibility for ICT Products and Services)",
    "statutory_note": "Identified under statutory accessibility provisions requiring barrier-free electronic communication.",
    "statutory_priority": "medium",
}


def get_india_mapping_for_rule(rule_id: str) -> dict[str, str]:
    """Retrieve Indian standard mapping for a specific rule."""
    return RULE_INDIA_MAPPINGS.get(rule_id, DEFAULT_INDIA_MAPPING)


def map_findings_to_india_compliance(findings: list) -> list[dict]:
    """Map a list of findings to their corresponding Indian standards.
    
    Returns structured data without any score, percentage, or compliance claims.
    """
    mapped = []
    seen = set()
    for f in findings:
        rule_id = getattr(f, "ruleId", None) or (f.get("ruleId") if isinstance(f, dict) else "")
        fingerprint = getattr(f, "fingerprint", None) or (f.get("fingerprint") if isinstance(f, dict) else "")
        target = getattr(f, "target", None) or (f.get("target") if isinstance(f, dict) else "")
        
        mapping = get_india_mapping_for_rule(rule_id)
        mapped.append({
            "fingerprint": fingerprint,
            "ruleId": rule_id,
            "target": target,
            "rpwdSection": mapping["rpwd_section"],
            "gigwClause": mapping["gigw_clause"],
            "is17802Clause": mapping["is_17802_clause"],
            "statutoryNote": mapping["statutory_note"],
            "statutoryPriority": mapping["statutory_priority"],
        })
    return mapped
