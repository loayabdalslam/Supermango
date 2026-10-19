from bee2bee.heartbeat import (
    DEFAULT_HEARTBEAT_URLS,
    HeartbeatClient,
    extract_nodes,
    is_local_heartbeat_url,
    normalize_node,
)


def test_normalize_node_reads_coordinates_and_models():
    node = normalize_node(
        {
            "id": "node-1",
            "url": "ws://203.0.113.9:4003",
            "region": "Cairo",
            "location": {"lat": 30.05, "lng": 31.24},
            "models": "llama3",
            "api_port": "4002",
        }
    )

    assert node["peer_id"] == "node-1"
    assert node["addr"] == "ws://203.0.113.9:4003"
    assert node["latitude"] == 30.05
    assert node["longitude"] == 31.24
    assert node["models"] == ["llama3"]
    assert node["api_port"] == 4002


def test_extract_nodes_accepts_common_wrappers():
    for payload in (
        [{"peer_id": "a", "latitude": 1, "longitude": 2}],
        {"nodes": [{"peer_id": "a", "lat": 1, "lon": 2}]},
        {"peers": [{"peer_id": "a", "coordinates": [2, 1]}]},
        {"data": {"nodes": [{"peer_id": "a", "geo": {"latitude": 1, "longitude": 2}}]}},
    ):
        nodes = extract_nodes(payload, "self", "ws://127.0.0.1:4003")
        assert len(nodes) == 1
        assert nodes[0]["latitude"] == 1
        assert nodes[0]["longitude"] == 2


def test_extract_nodes_falls_back_to_root_location_for_self():
    nodes = extract_nodes(
        {"latitude": 30.05, "longitude": 31.24},
        "self-1",
        "ws://203.0.113.5:4003",
    )

    assert len(nodes) == 1
    assert nodes[0]["peer_id"] == "self-1"
    assert nodes[0]["addr"] == "ws://203.0.113.5:4003"
    assert nodes[0]["longitude"] == 31.24


def test_normalize_node_ignores_items_without_identity():
    assert normalize_node({"region": "Cairo"}) is None


def test_local_heartbeat_urls_are_detected():
    assert is_local_heartbeat_url("http://localhost:3000/api/heartbeat")
    assert is_local_heartbeat_url("http://127.0.0.1:3001/api/heartbeat/")
    assert not is_local_heartbeat_url("http://localhost:4000/api/heartbeat")
    assert not is_local_heartbeat_url("https://heartbeat.example.com/nodes")


def test_client_falls_back_for_local_and_pins_remote_endpoints(monkeypatch):
    monkeypatch.delenv("BEE2BEE_HEARTBEAT_URL", raising=False)

    default = HeartbeatClient(object())
    assert default.urls == list(DEFAULT_HEARTBEAT_URLS)
    assert default.url == DEFAULT_HEARTBEAT_URLS[0]

    local = HeartbeatClient(object(), url="http://localhost:3000/api/heartbeat")
    assert local.urls == list(DEFAULT_HEARTBEAT_URLS)

    remote = HeartbeatClient(object(), url="https://heartbeat.example.com/nodes")
    assert remote.urls == ["https://heartbeat.example.com/nodes"]
    assert remote.url == "https://heartbeat.example.com/nodes"
