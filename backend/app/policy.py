"""Target policy: consent, scheme and host checks (FR-01, FR-02, PRD §15)."""
import ipaddress
import socket
from urllib.parse import urlparse

from . import config
from .errors import APIError


def _addresses(host: str) -> list:
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise APIError("invalid_url", f"Host '{host}' could not be resolved.", 422) from exc
    return [ipaddress.ip_address(info[4][0].split("%")[0]) for info in infos]


def check_url(url: str) -> str:
    """Validate a target URL and return it normalised. Raises APIError when not allowed."""
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise APIError("invalid_url", "Only http:// and https:// URLs with a host can be scanned.", 422)
    for addr in _addresses(parsed.hostname):
        if addr.is_loopback:
            if config.ALLOW_LOCALHOST:
                continue
            raise APIError("target_not_allowed", "Loopback targets are disabled on this deployment.", 403)
        if addr.is_private or addr.is_link_local or addr.is_multicast or addr.is_reserved or addr.is_unspecified:
            raise APIError("target_not_allowed", "Private, link-local and reserved network targets cannot be scanned.", 403)
    return parsed.geturl()


def check_request(url: str, authorized: bool) -> str:
    if not authorized:
        raise APIError("consent_required", "Confirm that you own this site or are authorised to test it.", 400)
    return check_url(url)


def navigation_allowed(url: str) -> bool:
    """Checked for every document navigation and redirect inside the browser."""
    if url.startswith(("about:", "data:")):
        return True
    try:
        check_url(url)
        return True
    except APIError:
        return False
