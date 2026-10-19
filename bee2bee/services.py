
from typing import Any, Dict, List, Optional
import time
import os
from rich.console import Console
from loguru import logger

console = Console()

class ServiceError(Exception):
    pass

class BaseService:
    def __init__(self, name: str):
        self.name = name

    def get_metadata(self) -> Dict[str, Any]:
        return {}

    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def execute_stream(self, params: Dict[str, Any]):
        """Returns a generator for streaming responses."""
        raise NotImplementedError

class HFService(BaseService):
    def __init__(self, model_name: str, price_per_token: float, max_new_tokens: int = 2048):
        super().__init__("hf")
        self.model_name = model_name
        self.price_per_token = price_per_token
        self.max_new_tokens = max_new_tokens
        self.model = None
        self.tokenizer = None
        self.device = None
        # We do NOT load immediately here to avoid blocking construction
        # The caller should call load_async

    def load_sync(self):
        """Blocking load."""
        self._load_model()

    def _load_model(self):
        console.print(f"[yellow]Loading model '{self.model_name}'... (This may take a while)[/yellow]")
        try:
            from .hf import load_model_and_tokenizer
            self.model, self.tokenizer, self.device = load_model_and_tokenizer(self.model_name)
            console.print(f"[green]Model '{self.model_name}' loaded successfully[/green]")
        except ImportError:
            raise ServiceError("transformers not installed")
        except Exception as e:
            raise ServiceError(f"Failed to load model: {e}")

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "models": [self.model_name],
            "price_per_token": self.price_per_token,
            "max_new_tokens": self.max_new_tokens
        }

    def execute_stream(self, params: Dict[str, Any]):
        if not self.model:
            raise ServiceError("Model not loaded")
        
        prompt = params.get("prompt")
        max_new = int(params.get("max_new_tokens", self.max_new_tokens))
        temperature = float(params.get("temperature", 0.7))
        
        if not prompt:
            raise ServiceError("Missing prompt")

        from .hf import generate_text_stream
        import json
        
        try:
            for text_chunk in generate_text_stream(self.model, self.tokenizer, self.device, prompt, max_new, temperature=temperature):
                yield json.dumps({"text": text_chunk}) + "\n"
            
            # Explicit End of Stream Signal - uses Python True for JSON true
            yield json.dumps({"done": True}) + "\n"
        except Exception as e:
            logger.error(f"Stream generation failed: {e}")
            yield json.dumps({"status": "error", "message": f"Stream error: {e}"}) + "\n"

    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        if not self.model:
            raise ServiceError("Model not loaded")
        
        prompt = params.get("prompt")
        max_new = int(params.get("max_new_tokens", self.max_new_tokens))
        temperature = float(params.get("temperature", 0.7))
        
        if not prompt:
            raise ServiceError("Missing prompt")

        try:
            t0 = time.time()
            from .hf import generate_text
            text = generate_text(self.model, self.tokenizer, self.device, prompt, max_new, temperature=temperature)
            
            # Token accounting
            in_tokens = len(self.tokenizer.encode(prompt))
            out_tokens = len(self.tokenizer.encode(text))
            new_tokens = max(0, out_tokens - in_tokens)
            latency_ms = int((time.time() - t0) * 1000.0)
            cost = self.price_per_token * new_tokens
            
            return {
                "text": text,
                "tokens": new_tokens,
                "latency_ms": latency_ms,
                "price_per_token": self.price_per_token,
                "cost": cost
            }
        except Exception as e:
            raise ServiceError(str(e))

class OllamaService(BaseService):
    def __init__(self, model_name: str, host: str = "http://localhost:11434"):
        super().__init__("ollama")
        self.model_name = model_name
        self.host = host
        self.price_per_token = 0.0 # Typically free if local
        
    def load_sync(self):
        # Check connection
        import requests
        try:
            # Add timeout to prevent hanging
            res = requests.get(f"{self.host}/api/tags", timeout=5)
            if res.status_code != 200:
                raise ServiceError(f"Ollama reachable but returned {res.status_code}")
            
            # Check if model exists
            models = [m["name"] for m in res.json().get("models", [])]
            self.actual_model = self.model_name
            # Simple substring check because ollama models have tags like 'llama3:latest'
            found = False
            for m in models:
                if self.model_name == m or self.model_name in m or m in self.model_name:
                    self.actual_model = m
                    found = True
                    break
            
            if not found:
                 # Try pull? For now just warn or error.
                 console.print(f"[yellow]Model '{self.model_name}' not found in Ollama '{self.host}'.[/yellow]")
                 console.print(f"[dim]Available: {models}[/dim]")
                 # Fallback to first model if list is small? No, stay on model_name but warn
            else:
                 console.print(f"[green]Ollama Model '{self.model_name}' ready (mapped to {self.actual_model})[/green]")
                 
        except Exception as e:
            raise ServiceError(f"Ollama connection failed: {e}")

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "models": [self.model_name, getattr(self, 'actual_model', self.model_name)],
            "price_per_token": self.price_per_token,
            "backend": "ollama"
        }

    def _options(self, max_new: int, temperature: float, num_gpu: Optional[int] = None) -> Dict[str, Any]:
        options: Dict[str, Any] = {
            "num_predict": max_new,
            "temperature": temperature,
        }
        # On some GPUs Ollama crashes (e.g. "CUDA error ... stack buffer
        # overrun"). Set BEE2BEE_OLLAMA_NUM_GPU=0 to force CPU inference.
        if num_gpu is None:
            env_val = os.getenv("BEE2BEE_OLLAMA_NUM_GPU")
            if env_val not in (None, ""):
                try:
                    num_gpu = int(env_val)
                except ValueError:
                    console.print(f"[yellow]Ignoring invalid BEE2BEE_OLLAMA_NUM_GPU={env_val!r}[/yellow]")
        if num_gpu is not None:
            options["num_gpu"] = num_gpu
        return options

    def _option_plan(self, max_new: int, temperature: float) -> List[Dict[str, Any]]:
        """Return the option sets to try in order.

        When the user has not pinned ``BEE2BEE_OLLAMA_NUM_GPU``, a GPU attempt
        is followed by a CPU attempt so a crashing GPU driver degrades to CPU
        instead of failing the request outright.
        """
        primary = self._options(max_new, temperature)
        if "num_gpu" in primary:
            return [primary]
        return [primary, self._options(max_new, temperature, num_gpu=0)]

    @staticmethod
    def _is_cuda_error(text: str) -> bool:
        haystack = (text or "").lower()
        return any(
            marker in haystack
            for marker in ("cuda", "0xc0000409", "kernel image is invalid", "llama-server process")
        )

    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        import requests
        prompt = params.get("prompt")
        max_new = int(params.get("max_new_tokens", 2048))
        temperature = float(params.get("temperature", 0.7))
        
        if not prompt:
            raise ServiceError("Missing prompt")

        target_model = getattr(self, 'actual_model', self.model_name)
        plan = self._option_plan(max_new, temperature)
        last_error: Optional[str] = None

        for index, options in enumerate(plan):
            is_last = index == len(plan) - 1
            try:
                t0 = time.time()
                payload = {
                    "model": target_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": options,
                }
                res = requests.post(f"{self.host}/api/generate", json=payload, timeout=300)
                if res.status_code != 200:
                    error_text = f"Ollama Error: {res.text}"
                    if not is_last and self._is_cuda_error(error_text):
                        logger.warning("Ollama GPU failure, retrying on CPU (num_gpu=0)")
                        last_error = error_text
                        continue
                    raise ServiceError(error_text)

                data = res.json()
                if data.get("error"):
                    error_text = f"Ollama Error: {data['error']}"
                    if not is_last and self._is_cuda_error(error_text):
                        logger.warning("Ollama GPU failure, retrying on CPU (num_gpu=0)")
                        last_error = error_text
                        continue
                    raise ServiceError(error_text)

                text = data.get("response", "")
                eval_count = data.get("eval_count", 0)
                duration_ns = data.get("total_duration", 0)
                latency_ms = duration_ns / 1_000_000 if duration_ns > 0 else (time.time() - t0) * 1000.0

                return {
                    "text": text,
                    "tokens": eval_count,
                    "latency_ms": latency_ms,
                    "price_per_token": self.price_per_token,
                    "cost": 0.0
                }
            except ServiceError as e:
                last_error = str(e)
                if is_last or not self._is_cuda_error(last_error):
                    raise
                logger.warning("Ollama GPU failure, retrying on CPU (num_gpu=0)")
            except Exception as e:
                raise ServiceError(f"Ollama Exec Error: {e}")

        raise ServiceError(last_error or "Ollama execution failed")

    def _stream_once(self, target_model: str, prompt: str, options: Dict[str, Any]):
        import requests
        import json
        payload = {
            "model": target_model,
            "prompt": prompt,
            "stream": True,
            "options": options,
        }
        emitted = False
        res = requests.post(f"{self.host}/api/generate", json=payload, stream=True, timeout=300)
        if res.status_code != 200:
            raise ServiceError(f"Ollama Error: {res.text}")

        for line in res.iter_lines():
            if not line:
                continue
            try:
                data = json.loads(line.decode("utf-8"))
            except json.JSONDecodeError:
                continue
            if data.get("error"):
                message = f"Ollama Error: {data['error']}"
                if not emitted and self._is_cuda_error(message):
                    raise ServiceError(message)
                yield json.dumps({"status": "error", "message": message}) + "\n"
                return
            chunk = data.get("response", "")
            if chunk:
                emitted = True
                yield json.dumps({"text": chunk}) + "\n"
            if data.get("done"):
                break

        yield json.dumps({"done": True}) + "\n"

    def execute_stream(self, params: Dict[str, Any]):
        import json
        prompt = params.get("prompt")
        target_model = getattr(self, 'actual_model', self.model_name)
        plan = self._option_plan(
            int(params.get("max_new_tokens", 2048)),
            float(params.get("temperature", 0.7)),
        )

        for index, options in enumerate(plan):
            is_last = index == len(plan) - 1
            try:
                yield from self._stream_once(target_model, prompt, options)
                return
            except ServiceError as e:
                if is_last or not self._is_cuda_error(str(e)):
                    logger.error(f"Ollama stream failed: {e}")
                    yield json.dumps({"status": "error", "message": str(e)}) + "\n"
                    return
                logger.warning("Ollama GPU failure, retrying on CPU (num_gpu=0)")
            except Exception as e:
                logger.error(f"Ollama stream failed: {e}")
                yield json.dumps({"status": "error", "message": str(e)}) + "\n"
                return

class HFRemoteService(BaseService):
    def __init__(self, model_name: str, token: Optional[str] = None, price_per_token: float = 0.005):
        super().__init__("hf_remote")
        self.model_name = model_name
        self.token = token or os.getenv("HUGGING_FACE_HUB_TOKEN")
        self.price_per_token = price_per_token
        self.client = None

    def load_sync(self):
        try:
            from huggingface_hub import InferenceClient
            self.client = InferenceClient(model=self.model_name, token=self.token)
            logger.success(f"HF Remote Client initialized for model '{self.model_name}' (remote)")
        except ImportError:
            raise ServiceError("huggingface_hub not installed. Run 'pip install huggingface-hub'")
        except Exception as e:
            raise ServiceError(f"Failed to init HF Remote Client: {e}")

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "models": [self.model_name],
            "price_per_token": self.price_per_token,
            "tag": "remote",
            "backend": "hf_remote"
        }

    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        if not self.client:
            raise ServiceError("Remote client not initialized")
        
        prompt = params.get("prompt")
        max_new = int(params.get("max_new_tokens", 32))
        
        if not prompt:
            raise ServiceError("Missing prompt")

        try:
            t0 = time.time()
            # result = client.text_generation(...)
            response = self.client.text_generation(
                prompt,
                max_new_tokens=max_new,
                temperature=params.get("temperature", 0.7),
                do_sample=params.get("do_sample", True)
            )
            
            latency_ms = int((time.time() - t0) * 1000.0)
            
            # Rough estimation of tokens (char length / 4)
            tokens = len(response) // 4
            cost = self.price_per_token * tokens

            return {
                "text": response,
                "tokens": tokens,
                "latency_ms": latency_ms,
                "price_per_token": self.price_per_token,
                "cost": cost,
                "backend": "hf_remote"
            }
        except Exception as e:
            raise ServiceError(f"HF Remote Execution Error: {e}")
