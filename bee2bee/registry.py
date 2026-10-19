from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from loguru import logger

from .utils import bee2bee_home


class RegistryClient:
    """Local, file-backed node registry.

    The registry lives in ``~/.bee2bee/registry.json`` and is only used for
    local/LAN discovery. There is no remote service, database, or API key.
    Entries older than ``BEE2BEE_REGISTRY_TTL`` seconds are ignored.
    """

    def __init__(self, entrypoint_url: Optional[str] = None):
        self.entrypoint_url = entrypoint_url
        self.path: Path = bee2bee_home() / "registry.json"
        self.ttl = int(os.getenv("BEE2BEE_REGISTRY_TTL", "120"))
        self.enabled = os.getenv("BEE2BEE_LOCAL_REGISTRY", "1").lower() not in {
            "0",
            "false",
            "no",
        }

    def _read(self) -> Dict[str, Dict[str, Any]]:
        if not self.path.exists():
            return {}
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            return raw if isinstance(raw, dict) else {}
        except Exception as exc:
            logger.warning(f"Could not read local registry: {exc}")
            return {}

    def _write(self, nodes: Dict[str, Dict[str, Any]]) -> None:
        try:
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(nodes, indent=2, ensure_ascii=False), encoding="utf-8")
            tmp.replace(self.path)
        except Exception as exc:
            logger.warning(f"Could not write local registry: {exc}")

    def _fresh(self, entry: Dict[str, Any]) -> bool:
        last_seen = entry.get("last_seen_ts")
        if not last_seen:
            return False
        return (time.time() - float(last_seen)) <= self.ttl

    async def sync_node(
        self,
        peer_id: str,
        address: str,
        models: List[str],
        latency: float = 0.0,
        tag: str = "local",
        region: str = "Auto",
        metrics: Optional[dict] = None,
    ) -> bool:
        if not self.enabled or not peer_id or not address:
            return False

        nodes = {key: value for key, value in self._read().items() if self._fresh(value)}
        nodes[peer_id] = {
            "peer_id": peer_id,
            "addr": address,
            "models": models,
            "latency_ms": latency,
            "region": region,
            "tag": tag,
            "metrics": metrics or {},
            "last_seen": datetime.now(timezone.utc).isoformat(),
            "last_seen_ts": time.time(),
        }
        self._write(nodes)
        return True

    async def list_nodes(self, limit: int = 50) -> List[Dict[str, Any]]:
        nodes = [entry for entry in self._read().values() if self._fresh(entry)]
        nodes.sort(key=lambda item: item.get("last_seen_ts", 0), reverse=True)
        return nodes[:limit]

    def list_nodes_sync(self, limit: int = 50) -> List[Dict[str, Any]]:
        nodes = [entry for entry in self._read().values() if self._fresh(entry)]
        nodes.sort(key=lambda item: item.get("last_seen_ts", 0), reverse=True)
        return nodes[:limit]
