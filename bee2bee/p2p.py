from __future__ import annotations

import base64
import hashlib
from typing import Any, Dict, List
from urllib.parse import parse_qs, urlencode, urlparse

JOIN_SCHEME = "bee2bee"


def _b64encode(value: str) -> str:
    return base64.urlsafe_b64encode(value.encode()).decode().rstrip("=")


def _b64decode(value: str) -> str:
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded).decode()


def generate_join_link(
    network: str,
    model: str,
    hash_hex: str,
    bootstrap: List[str],
    api_port: int | None = None,
) -> str:
    """Build a local ``bee2bee://join`` deep link.

    No external coordinator is involved: the link only carries the model and
    the bootstrap WebSocket address(es) of the node that generated it.
    """
    params: Dict[str, Any] = {
        "network": network,
        "model": model,
        "hash": hash_hex,
    }
    if api_port is not None:
        params["api_port"] = int(api_port)
    if bootstrap:
        params["bootstrap"] = [_b64encode(addr) for addr in bootstrap]
    return f"{JOIN_SCHEME}://join?{urlencode(params, doseq=True)}"


def parse_join_link(link: str) -> Dict[str, Any]:
    parsed = urlparse(link)
    if parsed.scheme != JOIN_SCHEME or parsed.netloc != "join":
        raise ValueError("invalid_link")
    qs = parse_qs(parsed.query)
    api_port = qs.get("api_port", [None])[0]
    return {
        "network": qs.get("network", [None])[0],
        "model": qs.get("model", [None])[0],
        "hash": qs.get("hash", [None])[0],
        "api_port": int(api_port) if api_port else None,
        "bootstrap": [_b64decode(item) for item in qs.get("bootstrap", [])],
    }


def sha256_hex_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def chunk_bytes(data: bytes, piece_size: int) -> List[bytes]:
    return [data[i : i + piece_size] for i in range(0, len(data), piece_size)]


def bitfield_from_pieces(total_pieces: int, have_indices: List[int]) -> List[int]:
    field = [0] * total_pieces
    for index in have_indices:
        if 0 <= index < total_pieces:
            field[index] = 1
    return field
