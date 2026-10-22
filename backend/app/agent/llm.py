"""OpenAI-compatible provider adapter: GitHub Models by default, Azure OpenAI when configured.

Returns (client, model) or (None, reason). Keys stay server-side and are never logged or exported.
"""
from .. import config


def make_client():
    try:
        from openai import AzureOpenAI, OpenAI
    except ImportError:  # pragma: no cover
        return None, "openai package not installed"
    if config.AZURE_OPENAI_ENDPOINT and config.AZURE_OPENAI_API_KEY and config.AZURE_OPENAI_DEPLOYMENT:
        client = AzureOpenAI(azure_endpoint=config.AZURE_OPENAI_ENDPOINT, api_key=config.AZURE_OPENAI_API_KEY,
                             api_version=config.AZURE_OPENAI_API_VERSION, timeout=config.LLM_TIMEOUT_S, max_retries=1)
        return client, config.AZURE_OPENAI_DEPLOYMENT
    if config.LLM_API_KEY:
        client = OpenAI(base_url=config.LLM_BASE_URL, api_key=config.LLM_API_KEY,
                        timeout=config.LLM_TIMEOUT_S, max_retries=1)
        return client, config.LLM_MODEL
    return None, "No model credentials configured (set GITHUB_TOKEN or AZURE_OPENAI_* in backend/.env)"


def provider_status() -> dict:
    if config.AZURE_OPENAI_ENDPOINT and config.AZURE_OPENAI_API_KEY and config.AZURE_OPENAI_DEPLOYMENT:
        return {"configured": True, "provider": "azure-openai", "model": config.AZURE_OPENAI_DEPLOYMENT}
    if config.LLM_API_KEY:
        return {"configured": True, "provider": "github-models", "model": config.LLM_MODEL}
    return {"configured": False, "provider": None, "model": None}
