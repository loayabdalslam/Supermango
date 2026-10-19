from __future__ import annotations

import asyncio
import json
import os
import platform
import socket
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from loguru import logger

from .utils import bee2bee_home, get_lan_ip, get_system_metrics

VERSION = "4.0.0"

DEFAULT_HEARTBEAT_URLS = (
    "http://localhost:3000/api/heartbeat",
    "http://localhost:3001/api/heartbeat",
    "http://127.0.0.1:3000/api/heartbeat",
    "http://127.0.0.1:3001/api/heartbeat",
)

_LOCAL_HEARTBEAT_HOSTS = ("http://localhost:", "http://127.0.0.1:")


def is_local_heartbeat_url(url: str) -> bool:
    """True for the built-in local web app heartbeat endpoints.

    Local URLs still get the port fallback (3000 -> 3001) so the node table
    works in both Vite dev mode and the gateway-served build.
    """
    candidate = url.strip().rstrip("/").lower()
    return (
        candidate.endswith("/api/heartbeat")
        and candidate.startswith(_LOCAL_HEARTBEAT_HOSTS)
        and (":3000/" in candidate or ":3001/" in candidate)
    )


def _first(mapping: Dict[str, Any], keys: List[str]) -> Any:
    for key in keys:
        value = mapping.get(key)
        if value not in (None, ""):
            return value
    return None


def _number(value: Any) -> Optional[float]:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _location(source: Dict[str, Any]) -> Dict[str, Optional[float]]:
    location = source.get("location") if isinstance(source.get("location"), dict) else {}
    geo = source.get("geo") if isinstance(source.get("geo"), dict) else {}
    coordinates = source.get("coordinates")
    if not isinstance(coordinates, (list, tuple)) or len(coordinates) < 2:
        coordinates = source.get("position")
    if not isinstance(coordinates, (list, tuple)) or len(coordinates) < 2:
        coordinates = []

    latitude = _number(
        _first(source, ["latitude", "lat"])
        or _first(location, ["latitude", "lat"])
        or _first(geo, ["latitude", "lat"])
    )
    longitude = _number(
        _first(source, ["longitude", "lng", "lon"])
        or _first(location, ["longitude", "lng", "lon"])
        or _first(geo, ["longitude", "lng", "lon"])
    )
    if latitude is None and coordinates:
        latitude = _number(coordinates[1])
    if longitude is None and coordinates:
        longitude = _number(coordinates[0])
    return {"latitude": latitude, "longitude": longitude}


def normalize_node(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not isinstance(item, dict):
        return None

    location = _location(item)
    peer_id = _first(item, ["peer_id", "node_id", "id", "key", "name"])
    addr = _first(item, ["addr", "address", "ws", "url", "endpoint"])
    host = _first(item, ["api_host", "public_ip", "ip", "host"])
    port = _number(_first(item, ["api_port", "port"]))
    if not addr and host:
        addr = f"ws://{host}:{_first(item, ['p2p_port']) or 4003}"
    if not peer_id and not addr:
        return None

    metrics = item.get("metrics") if isinstance(item.get("metrics"), dict) else {}
    models = item.get("models")
    if isinstance(models, str):
        models = [models]
    if not isinstance(models, list):
        models = []

    return {
        "peer_id": str(peer_id or addr),
        "addr": addr,
        "region": _first(item, ["region", "country", "city", "area"]),
        "models": [str(model) for model in models],
        "api_port": int(port) if port else None,
        "api_host": host,
        "public_ip": _first(item, ["public_ip", "ip"]),
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "status": item.get("status") or "online",
        "metrics": metrics,
        "backend": item.get("backend"),
        "last_seen": item.get("last_seen") or time.time(),
        "raw": item,
    }


def extract_nodes(payload: Any, self_id: str, self_addr: str) -> List[Dict[str, Any]]:
    items: List[Any] = []

    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict):
        for key in ("nodes", "peers", "results", "items", "data"):
            value = payload.get(key)
            if isinstance(value, list):
                items = value
                break
            if isinstance(value, dict):
                for nested_key in ("nodes", "peers", "results", "items"):
                    nested = value.get(nested_key)
                    if isinstance(nested, list):
                        items = nested
                        break
            if items:
                break

        if not items:
            self_item = payload.get("node") or payload.get("self")
            if isinstance(self_item, dict):
                items = [self_item]
            elif payload.get("latitude") or payload.get("lat") or payload.get("location"):
                items = [{**payload, "peer_id": self_id, "addr": self_addr}]

    nodes = []
    for item in items:
        node = normalize_node(item)
        if node:
            nodes.append(node)
    return nodes


class HeartbeatClient:
    """Push full node state to a heartbeat endpoint and read mesh coordinates.

    The endpoint is configured with ``BEE2BEE_HEARTBEAT_URL``. Optional
    ``BEE2BEE_HEARTBEAT_TOKEN`` is sent as a Bearer token. The latest response
    is persisted to ``~/.bee2bee/heartbeat.json`` for the local web gateway.
    """

    def __init__(self, node, url: Optional[str] = None, token: Optional[str] = None,
                 interval: Optional[int] = None):
        self.node = node
        configured = (url or os.getenv("BEE2BEE_HEARTBEAT_URL") or "").strip()
        if configured and not is_local_heartbeat_url(configured):
            self.urls = [configured]
        else:
            self.urls = list(DEFAULT_HEARTBEAT_URLS)
        self.url = self.urls[0]
        self.token = (token or os.getenv("BEE2BEE_HEARTBEAT_TOKEN") or "").strip()
        self.interval = int(interval or os.getenv("BEE2BEE_HEARTBEAT_INTERVAL", "30"))
        self.path: Path = bee2bee_home() / "heartbeat.json"
        self.nodes: List[Dict[str, Any]] = []
        self._public_ip: Optional[str] = None
        self._public_ip_at = 0.0
        self._task: Optional[asyncio.Task] = None
        self._stop = asyncio.Event()
        self._last_error: Optional[str] = None
        self._last_error_at = 0.0

    @property
    def enabled(self) -> bool:
        return bool(self.urls)

    def _ordered_urls(self) -> List[str]:
        return [self.url, *[item for item in self.urls if item != self.url]]

    def _remember_url(self, url: str) -> None:
        self.url = url
        if url in self.urls:
            self.urls.remove(url)
        self.urls.insert(0, url)

    async def start(self) -> bool:
        if not self.enabled:
            return False
        if self._task and not self._task.done():
            return True
        self._stop.clear()
        self._task = asyncio.create_task(self._run())
        targets = self.url if len(self.urls) == 1 else f"{self.url} (fallbacks: {', '.join(self.urls[1:])})"
        logger.info(f"Heartbeat enabled: {targets} (every {self.interval}s)")
        return True

    async def stop(self) -> None:
        self._stop.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):
                pass
            self._task = None

    async def _run(self) -> None:
        while not self._stop.is_set():
            try:
                await self.send()
                if self._last_error:
                    logger.info("Heartbeat connection restored")
                    self._last_error = None
            except Exception as exc:
                message = str(exc)
                now = time.time()
                if message != self._last_error or now - self._last_error_at > 300:
                    logger.warning(f"Heartbeat failed: {message}")
                    self._last_error = message
                    self._last_error_at = now
                else:
                    logger.debug(f"Heartbeat still failing: {message}")
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=self.interval)
            except asyncio.TimeoutError:
                continue

    async def _resolve_public_ip(self) -> Optional[str]:
        now = time.time()
        if self._public_ip and now - self._public_ip_at < 300:
            return self._public_ip

        public_host = getattr(self.node, "public_host", None)
        if public_host and not public_host.startswith(("127.", "10.", "192.168.", "172.")):
            self._public_ip = public_host
            self._public_ip_at = now
            return self._public_ip

        try:
            from .nat import get_public_ip

            self._public_ip = await get_public_ip()
            self._public_ip_at = now
        except Exception:
            self._public_ip = None
        return self._public_ip

    async def snapshot(self) -> Dict[str, Any]:
        node = self.node
        metrics = get_system_metrics()
        models: List[str] = []
        services: Dict[str, Any] = {}
        for name, service in node.local_services.items():
            try:
                meta = service.get_metadata()
            except Exception:
                meta = {}
            services[name] = meta
            models.extend(meta.get("models") or [])

        public_ip = await self._resolve_public_ip()
        payload = {
            "type": "heartbeat",
            "peer_id": node.peer_id,
            "addr": node.addr,
            "host": node.host,
            "p2p_port": node.port,
            "public_ip": public_ip,
            "local_ip": get_lan_ip(),
            "api_port": getattr(node, "api_port", None),
            "api_host": getattr(node, "api_host", None) or public_ip,
            "region": getattr(node, "region", None) or "Auto",
            "models": sorted(set(models)),
            "services": services,
            "metrics": {
                **metrics,
                "peers": len(node.peers),
                "uptime": int(time.time() - getattr(node, "start_time", time.time())),
            },
            "latitude": getattr(node, "latitude", None),
            "longitude": getattr(node, "longitude", None),
            "hostname": socket.gethostname(),
            "platform": platform.platform(),
            "python": platform.python_version(),
            "version": VERSION,
            "started_at": getattr(node, "start_time", None),
            "heartbeat_url": self.url,
            "timestamp": time.time(),
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }
        return payload

    def _post(self, payload: Dict[str, Any]) -> Any:
        headers = {"Content-Type": "application/json", "User-Agent": f"Bee2Bee/{VERSION}"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        last_error: Optional[Exception] = None
        for url in self._ordered_urls():
            try:
                response = requests.post(url, json=payload, headers=headers, timeout=15)
                response.raise_for_status()
                self._remember_url(url)
                content_type = response.headers.get("Content-Type", "")
                if "json" in content_type or response.text.strip().startswith(("{", "[")):
                    return response.json()
                return {"raw": response.text}
            except Exception as exc:
                last_error = exc
                if len(self.urls) > 1:
                    logger.debug(f"Heartbeat endpoint {url} unreachable: {exc}")

        if last_error is not None:
            raise last_error
        raise RuntimeError("No heartbeat endpoint configured")

    async def send(self) -> List[Dict[str, Any]]:
        payload = await self.snapshot()
        data = await asyncio.to_thread(self._post, payload)

        nodes = extract_nodes(data, payload["peer_id"], payload["addr"])
        self.nodes = nodes

        for item in nodes:
            if item.get("peer_id") == payload["peer_id"] or item.get("addr") == payload["addr"]:
                if item.get("latitude") is not None:
                    self.node.latitude = item["latitude"]
                if item.get("longitude") is not None:
                    self.node.longitude = item["longitude"]

        self._write(payload, nodes)
        return nodes

    def _write(self, payload: Dict[str, Any], nodes: List[Dict[str, Any]]) -> None:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            body = {
                "updated_at": int(time.time() * 1000),
                "source": self.url,
                "self": payload,
                "nodes": nodes,
            }
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(body, ensure_ascii=False), encoding="utf-8")
            tmp.replace(self.path)
        except Exception as exc:
            logger.warning(f"Could not write heartbeat state: {exc}")
