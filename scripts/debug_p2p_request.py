#!/usr/bin/env python3
"""
Debug script to test p2p-request functionality
"""

import asyncio
import json
from bee2bee.p2p_runtime import P2PNode

async def debug_p2p_request():
    print("Starting debug P2P request...")
    
    # Create P2P node
    node = P2PNode(host="127.0.0.1", port=0)
    await node.start()
    print(f"P2P node started: {node.addr}")
    
    # Connect to bootstrap
    bootstrap_link = "ws://127.0.0.1:4003"
    print(f"Connecting to bootstrap: {bootstrap_link}")
    await node.connect_bootstrap(bootstrap_link)
    
    # Wait for service discovery
    print("Waiting for service discovery...")
    await asyncio.sleep(3)
    
    # Debug: Print all providers
    print(f"\nAll providers: {node.providers}")
    print(f"All peers: {node.peers}")
    
    # Check for distilgpt2 providers
    model = "distilgpt2"
    providers = []
    for pid, info in node.providers.items():
        hf_info = info.get('hf', {})
        models = hf_info.get('models', [])
        print(f"Provider {pid}: hf_info={hf_info}, models={models}")
        if model in models:
            providers.append((pid, info))
    
    print(f"\nFound {len(providers)} providers for model '{model}'")
    
    if providers:
        # Pick the best provider
        best = node.pick_provider(model)
        if best:
            pid, provider_info = best
            print(f"Selected provider: {pid}")
            
            # Request generation
            print("Requesting generation...")
            result = await node.request_generation(pid, "Hello, how are you?", max_new_tokens=10, model_name=model)
            print(f"Generation result: {result}")
        else:
            print("No provider selected by pick_provider")
    else:
        print("No providers found")
    
    await node.stop()
    print("P2P node stopped")

if __name__ == "__main__":
    try:
        asyncio.run(debug_p2p_request())
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()