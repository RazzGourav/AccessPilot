"""Isolated working copies of the demo site (FR-10, PRD §9.6).

The original demo/ directory is never written. Every approved patch is applied to a fresh copy of
the version it was proposed against, served at /ws/<id>/.
"""
import difflib
import shutil
import tempfile
import threading
import uuid
from pathlib import Path
from urllib.parse import urlparse

from .. import config
from ..errors import APIError
from .templates import Template

ALLOWED_FILES = frozenset({"demo.html", "demo.css"})
ORIGINAL = "original"
ROOT = Path(tempfile.gettempdir()) / "accesspilot-workspaces"
_LOOPBACK = {"127.0.0.1", "localhost", "::1"}

_lock = threading.Lock()
_dirs: dict[str, Path] = {ORIGINAL: config.DEMO_DIR}


class PatchError(Exception):
    pass


def dir_for(workspace_id: str | None) -> Path:
    path = _dirs.get(workspace_id or ORIGINAL)
    if path is None:
        raise APIError("not_found", "Unknown working copy.", 404)
    return path


def lookup(workspace_id: str) -> Path | None:
    return _dirs.get(workspace_id)


def url_for(workspace_id: str, page: str = "demo.html") -> str:
    if workspace_id == ORIGINAL:
        return f"{config.PUBLIC_BASE}/demo/{page}"
    return f"{config.PUBLIC_BASE}/ws/{workspace_id}/{page}"


def resolve_target(url: str) -> str | None:
    """Return the workspace id when the URL is the bundled Golden Site (original or a copy)."""
    parsed = urlparse(url)
    if parsed.hostname not in _LOOPBACK or (parsed.port or 80) != config.PORT:
        return None
    parts = [p for p in parsed.path.split("/") if p]
    if parts == ["demo", "demo.html"]:
        return ORIGINAL
    if len(parts) == 3 and parts[0] == "ws" and parts[2] == "demo.html" and parts[1] in _dirs:
        return parts[1]
    return None


def create_from(source: Path) -> tuple[str, Path]:
    ROOT.mkdir(parents=True, exist_ok=True)
    wid = "ws" + uuid.uuid4().hex[:8]
    dest = ROOT / wid
    shutil.copytree(source, dest)
    with _lock:
        _dirs[wid] = dest
    return wid, dest


def _check_path(file: str) -> None:
    if file not in ALLOWED_FILES or "/" in file or "\\" in file:
        raise APIError("path_not_allowed", f"Patches may only touch {', '.join(sorted(ALLOWED_FILES))}.", 403)


def patched_text(directory: Path, tpl: Template, params: dict[str, str]) -> tuple[str, str]:
    _check_path(tpl.file)
    original = (directory / tpl.file).read_text(encoding="utf-8")
    if original.count(tpl.find) != 1:
        raise PatchError(f"Expected exactly one match for the template in {tpl.file}; found {original.count(tpl.find)}.")
    return original, original.replace(tpl.find, tpl.render(params), 1)


def diff(directory: Path, tpl: Template, params: dict[str, str]) -> str:
    before, after = patched_text(directory, tpl, params)
    return "".join(difflib.unified_diff(
        before.splitlines(keepends=True), after.splitlines(keepends=True),
        fromfile=f"a/demo/{tpl.file}", tofile=f"b/demo/{tpl.file}", n=2,
    ))


_backups: dict[str, list[dict[str, str]]] = {}


def apply(directory: Path, tpl: Template, params: dict[str, str]) -> None:
    if directory.resolve() == config.DEMO_DIR.resolve():
        raise APIError("path_not_allowed", "The original demo directory is never patched.", 403)
    before, after = patched_text(directory, tpl, params)
    # Store backup before applying modification
    wid = directory.name
    with _lock:
        for k, v in _dirs.items():
            if v.resolve() == directory.resolve():
                wid = k
                break
        if wid not in _backups:
            _backups[wid] = []
        _backups[wid].append({"file": tpl.file, "content": before})
    (directory / tpl.file).write_text(after, encoding="utf-8")


def rollback(workspace_id: str) -> int:
    """Roll back the most recent patch in a workspace. Returns the remaining backup count."""
    directory = lookup(workspace_id)
    if directory is None:
        raise APIError("not_found", "Unknown workspace for rollback.", 404)
    with _lock:
        history = _backups.get(workspace_id, [])
        if not history:
            raise APIError("not_found", "No previous versions available to roll back.", 404)
        last_state = history.pop()
    
    file_path = directory / last_state["file"]
    file_path.write_text(last_state["content"], encoding="utf-8")
    return len(history)
