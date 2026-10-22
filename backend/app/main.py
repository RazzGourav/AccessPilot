"""AccessPilot API. Run: uvicorn app.main:app --port 8000   (no --reload needed; see README)."""
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from . import config, policy, scanner, store, verifier
from .agent import llm, runner
from .compliance.india import map_findings_to_india_compliance
from .errors import APIError
from .fixer import service, workspace
from .fixer.templates import catalogue
from .impact import analyze_impact
from .models import (AgentRun, AgentRunRequest, ApplyRequest, ApplyResult, Comparison, CompareRequest,
                     ComplianceMapping, ExperienceSimulation, ImpactSummary, MultiAgentRun,
                     MultiAgentRunRequest, ProposeRequest, RepairProposal, RollbackRequest,
                     RollbackResult, Scan, ScanRequest, TopBarrier, TraceEntry)
from .ux_simulator import simulate_experience

app = FastAPI(title="AccessPilot", version="0.1.0")


def _error(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, "requestId": uuid.uuid4().hex[:12]}})


@app.exception_handler(APIError)
async def api_error(_: Request, exc: APIError):
    return _error(exc.code, exc.message, exc.status)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    return _error("invalid_request", f"{'.'.join(str(p) for p in first.get('loc', []))}: {first.get('msg', 'invalid')}", 422)


@app.get("/api/health")
def health():
    return {"status": "ok", "axeBundled": config.AXE_PATH.exists(), "ai": llm.provider_status(),
            "demoUrl": workspace.url_for(workspace.ORIGINAL), "controlUrl": workspace.url_for(workspace.ORIGINAL, "control.html")}


@app.post("/api/scan", response_model=Scan)
async def scan(req: ScanRequest):
    t0 = time.perf_counter()
    url = policy.check_request(req.url, req.authorized)
    pre = [TraceEntry(step="target_validated", status="ok", durationMs=int((time.perf_counter() - t0) * 1000), detail="consent recorded")]
    wid = workspace.resolve_target(url)
    return await run_in_threadpool(scanner.run_scan, url, repairable=wid is not None,
                                   workspace_id=None if wid == workspace.ORIGINAL else wid, trace=pre)


@app.post("/api/agent/run", response_model=AgentRun)
async def agent_run(req: AgentRunRequest):
    return await run_in_threadpool(runner.run, service.get_scan(req.scanId))


@app.post("/api/agent/run-multi", response_model=MultiAgentRun)
async def agent_run_multi(req: MultiAgentRunRequest):
    return await run_in_threadpool(runner.run_multi, service.get_scan(req.scanId), req.requestedSpecialists)


@app.get("/api/scans/{scan_id}/experience", response_model=ExperienceSimulation)
def get_experience(scan_id: str):
    return simulate_experience(service.get_scan(scan_id))


@app.get("/api/scans/{scan_id}/compliance")
def get_compliance(scan_id: str):
    scan = service.get_scan(scan_id)
    mappings = map_findings_to_india_compliance(scan.violations)
    return {"scanId": scan_id, "compliance": mappings}


@app.get("/api/scans/{scan_id}/impact", response_model=ImpactSummary)
def get_impact(scan_id: str):
    scan = service.get_scan(scan_id)
    raw = analyze_impact(scan.violations)
    return ImpactSummary(
        totalBarriers=raw["totalBarriers"],
        barrierCountsBySeverity=raw["barrierCountsBySeverity"],
        affectedUserGroups=raw["affectedUserGroups"],
        estimatedRemediationMinutes=raw["estimatedRemediationMinutes"],
        legalExposureLevel=raw["legalExposureLevel"],
        exposureSummary=raw["exposureSummary"],
        topBarriers=[TopBarrier(ruleId=b["ruleId"], count=b["count"]) for b in raw["topBarriers"]],
    )


@app.get("/api/repair/templates")
def templates():
    return {"templates": catalogue()}


@app.post("/api/repair/propose", response_model=RepairProposal)
def propose(req: ProposeRequest):
    return service.propose(req.scanId, req.fingerprint, req.params)


@app.post("/api/repair/apply", response_model=ApplyResult)
async def apply(req: ApplyRequest):
    return await run_in_threadpool(service.apply, req)


@app.post("/api/repair/rollback", response_model=RollbackResult)
def rollback(req: RollbackRequest):
    return service.rollback_proposal(req.workspaceId, req.proposalId)


@app.post("/api/scan/compare", response_model=Comparison)
def compare(req: CompareRequest):
    return verifier.compare(service.get_scan(req.beforeId), service.get_scan(req.afterId))


@app.get("/api/scans/{scan_id}", response_model=Scan)
def get_scan(scan_id: str):
    return service.get_scan(scan_id)


@app.get("/api/scans/{scan_id}/screenshot")
def screenshot(scan_id: str):
    """The page as scanned, for the evidence view. In memory only; not part of the export."""
    service.get_scan(scan_id)
    shot = store.screenshots.get(scan_id)
    if shot is None:
        raise APIError("not_found", "No page capture for this scan.", 404)
    return Response(shot, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=3600"})


@app.get("/api/reports/{scan_id}")
def report(scan_id: str):
    """JSON export (FR-14): scope, evidence, AI advice, repairs and limits. No keys, tokens or page source."""
    s = service.get_scan(scan_id)
    related = [p for p in store.proposals.values() if p.scanId == scan_id]
    run = store.agent_runs.get(scan_id)
    multi_run = store.multi_agent_runs.get(scan_id)
    body = {
        "report": "AccessPilot accessibility evidence report",
        "replay": False,
        "disclaimer": "Automated and heuristic checks only. Not a compliance certificate or legal advice.",
        "scan": s.model_dump(),
        "agent": run.model_dump(exclude={"proposals"}) if run else None,
        "multiAgent": multi_run.model_dump(exclude={"proposals"}) if multi_run else None,
        "repairs": [{"proposal": p.model_dump(exclude={"approvalToken"}),
                     "result": store.results[p.proposalId].model_dump() if p.proposalId in store.results else None}
                    for p in related],
    }
    return JSONResponse(body, headers={"Content-Disposition": f'attachment; filename="accesspilot-{scan_id}.json"'})


# --- static targets: the Golden Site, its working copies, and the built UI -----------------------
app.mount("/demo", StaticFiles(directory=config.DEMO_DIR, html=True), name="demo")


@app.get("/ws/{wid}/{name}")
def workspace_file(wid: str, name: str):
    directory = workspace.lookup(wid)
    path = (directory / name).resolve() if directory else None
    if not path or path.parent != directory.resolve() or not path.is_file():
        return _error("not_found", "File not found.", 404)
    return FileResponse(path)


# The UI's pages (frontend/src/router.tsx ROUTES). Only these serve index.html, so a deep link or a
# reload works while any other unknown path still returns a real 404.
SITE_PAGES = {"how-it-works", "audit", "findings", "repairs", "report", "accessibility", "dashboard", "experience"}


@app.get("/{page}", include_in_schema=False)
def site_page(page: str):
    index = config.FRONTEND_DIST / "index.html"
    if page not in SITE_PAGES or not index.exists():
        return _error("not_found", "Page not found.", 404)
    return FileResponse(index)


if config.FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=config.FRONTEND_DIST, html=True), name="ui")
