import json

from bee2bee.services import OllamaService


class _FakeResponse:
    def __init__(self, status_code=200, text="", lines=None):
        self.status_code = status_code
        self.text = text
        self._lines = lines or []

    def json(self):
        return {"response": "ok", "eval_count": 1, "total_duration": 1_000_000}

    def iter_lines(self):
        for line in self._lines:
            yield line.encode("utf-8")


def _service():
    service = OllamaService.__new__(OllamaService)
    service.model_name = "gemma3:4b"
    service.actual_model = "gemma3:4b"
    service.host = "http://localhost:11434"
    service.price_per_token = 0.0
    return service


def test_is_cuda_error_matches_known_messages():
    service = _service()
    assert service._is_cuda_error("CUDA error: device kernel image is invalid")
    assert service._is_cuda_error("exit status 0xc0000409")
    assert not service._is_cuda_error("model not found")


def test_execute_stream_retries_on_cpu_after_cuda_failure(monkeypatch):
    service = _service()
    calls = []

    def fake_post(url, json=None, stream=False, timeout=None):
        calls.append(json)
        if len(calls) == 1:
            return _FakeResponse(
                status_code=500,
                text="CUDA error: device kernel image is invalid",
            )
        return _FakeResponse(lines=[json_module.dumps({"response": "hi", "done": True})])

    json_module = json
    monkeypatch.delenv("BEE2BEE_OLLAMA_NUM_GPU", raising=False)
    monkeypatch.setattr("requests.post", fake_post)

    output = "".join(service.execute_stream({"prompt": "hello", "max_new_tokens": 8}))

    assert len(calls) == 2
    assert "num_gpu" not in calls[0]["options"]
    assert calls[1]["options"]["num_gpu"] == 0
    assert json.loads(output.splitlines()[0])["text"] == "hi"


def test_execute_retries_on_cpu_after_cuda_failure(monkeypatch):
    service = _service()
    calls = []

    def fake_post(url, json=None, timeout=None):
        calls.append(json)
        if len(calls) == 1:
            return _FakeResponse(
                status_code=500,
                text="CUDA error: device kernel image is invalid",
            )
        return _FakeResponse()

    monkeypatch.delenv("BEE2BEE_OLLAMA_NUM_GPU", raising=False)
    monkeypatch.setattr("requests.post", fake_post)

    result = service.execute({"prompt": "hello"})

    assert result["text"] == "ok"
    assert calls[1]["options"]["num_gpu"] == 0


def test_pinned_num_gpu_does_not_retry(monkeypatch):
    service = _service()
    calls = []

    def fake_post(url, json=None, timeout=None):
        calls.append(json)
        return _FakeResponse(status_code=500, text="CUDA error")

    monkeypatch.setenv("BEE2BEE_OLLAMA_NUM_GPU", "0")
    monkeypatch.setattr("requests.post", fake_post)

    result = service._option_plan(8, 0.2)
    assert result == [{"num_predict": 8, "temperature": 0.2, "num_gpu": 0}]
    assert calls == []
