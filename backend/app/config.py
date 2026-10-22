"""Runtime settings, read once from the environment (and backend/.env if present)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env")

DEMO_DIR = ROOT_DIR / "demo"
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
AXE_PATH = BACKEND_DIR / "vendor" / "axe.min.js"

HOST = os.getenv("ACCESSPILOT_HOST", "127.0.0.1")
PORT = int(os.getenv("ACCESSPILOT_PORT", "8000"))
PUBLIC_BASE = os.getenv("ACCESSPILOT_PUBLIC_BASE", f"http://{HOST}:{PORT}")

# Development exception: loopback targets are allowed so the bundled demo can be scanned.
# A hosted deployment must set this to 0 (see README, Security).
ALLOW_LOCALHOST = os.getenv("ACCESSPILOT_ALLOW_LOCALHOST", "1") == "1"

AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]
NAV_TIMEOUT_MS = 15_000
KEYBOARD_LIMIT = 30
KEYBOARD_BUDGET_S = 5.0
SNIPPET_MAX = 300
SHOT_WIDTH = 1280
SHOT_MAX_HEIGHT = 2400

# Runtime LLM (optional). GitHub Models by default; Azure OpenAI when AZURE_OPENAI_ENDPOINT is set.
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://models.github.ai/inference")
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-4.1-mini")
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("GITHUB_TOKEN") or ""
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-21")
LLM_TIMEOUT_S = 20.0
AGENT_MAX_TURNS = 8
AGENT_MAX_TOOL_CALLS = 14
AGENT_BUDGET_S = 90.0

# Multi-agent bounded limits (higher turn/tool limit for multi-specialist coordination within 120s budget)
AGENT_MULTI_MAX_TURNS = 12
AGENT_MULTI_MAX_TOOL_CALLS = 20
AGENT_MULTI_BUDGET_S = 120.0

# Regional compliance and localization settings
LANGUAGE = os.getenv("ACCESSPILOT_LANGUAGE", "en")
COMPLIANCE_MODULES = ["india", "wcag"]
