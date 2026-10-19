#!/usr/bin/env python3
"""Request a generation from the best provider on a local Bee2Bee mesh.

Usage:
    python examples/p2p_request_demo.py --bootstrap ws://127.0.0.1:4003

Prerequisites:
    python -m bee2bee serve-ollama --model llama3 --port 4003 --api-port 4002
"""

import argparse
import asyncio

from bee2bee.p2p_runtime import P2PNode


async def main(bootstrap: str, model: str, prompt: str) -> None:
    node = P2PNode(host="127.0.0.1", port=0)
    await node.start()
    try:
        await node.connect_bootstrap(bootstrap)
        await asyncio.sleep(2)

        provider = node.pick_provider(model)
        if not provider:
            print(f"No provider found for {model} on {bootstrap}")
            return

        provider_id, info = provider
        print(f"Using {provider_id} ({info.get('region', 'local')})")

        result = await node.request_generation(\n            provider_id, prompt, model_name=model\n        )\n        print(result.get("text", result) if isinstance(result, dict) else result)
    finally:
        await node.stop()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--bootstrap", default="ws://127.0.0.1:4003")
    parser.add_argument("--model", default="llama3")
    parser.add_argument("--prompt", default="Say hello in one sentence.")
    args = parser.parse_args()
    asyncio.run(main(args.bootstrap, args.model, args.prompt))
