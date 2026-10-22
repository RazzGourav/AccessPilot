"""In-memory storage for the MVP. Nothing is persisted to disk except demo working copies."""
import threading
import uuid

from .models import AgentRun, ApplyResult, RepairProposal, Scan

_lock = threading.Lock()
scans: dict[str, Scan] = {}
proposals: dict[str, RepairProposal] = {}
results: dict[str, ApplyResult] = {}
agent_runs: dict[str, AgentRun] = {}
multi_agent_runs: dict[str, "MultiAgentRun"] = {}
screenshots: dict[str, bytes] = {}  # evidence view only; never exported or written to disk


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def put_scan(scan: Scan) -> None:
    with _lock:
        scans[scan.scanId] = scan


def put_proposal(p: RepairProposal) -> None:
    with _lock:
        proposals[p.proposalId] = p


def put_result(r: ApplyResult) -> None:
    with _lock:
        results[r.proposalId] = r
