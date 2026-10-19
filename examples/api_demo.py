"""Start the Bee2Bee API and query it."""

import multiprocessing
import time

import requests
import uvicorn

from bee2bee.api import app

API_URL = "http://127.0.0.1:4002"


def start_api_server() -> None:
    uvicorn.run(app, host="127.0.0.1", port=4002, log_level="error")


def run_demo() -> None:
    process = multiprocessing.Process(target=start_api_server)
    process.start()
    try:
        time.sleep(2)
        for path in ("/health", "/", "/peers", "/providers"):
            response = requests.get(f"{API_URL}{path}", timeout=5)
            print(f"GET {path} -> {response.status_code}")
            print(response.json())
    finally:
        process.terminate()
        process.join()


if __name__ == "__main__":
    run_demo()
