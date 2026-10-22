import os
import socket
import threading
import time

import pytest

# Separate port so tests never collide with a dev server on 8000. Must be set before importing app.
os.environ["ACCESSPILOT_PORT"] = "8765"
os.environ["GITHUB_TOKEN"] = ""
os.environ["LLM_API_KEY"] = ""
os.environ["AZURE_OPENAI_ENDPOINT"] = ""

BASE = "http://127.0.0.1:8765"


@pytest.fixture(scope="session")
def server():
    import uvicorn

    from app.main import app

    srv = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=8765, log_level="warning"))
    thread = threading.Thread(target=srv.run, daemon=True)
    thread.start()
    for _ in range(100):
        try:
            socket.create_connection(("127.0.0.1", 8765), timeout=0.2).close()
            break
        except OSError:
            time.sleep(0.1)
    yield BASE
    srv.should_exit = True
    thread.join(timeout=5)


@pytest.fixture(scope="session")
def http(server):
    import httpx

    with httpx.Client(base_url=server, timeout=120) as client:
        yield client
