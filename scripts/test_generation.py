#!/usr/bin/env python3
import asyncio
from bee2bee.p2p_runtime import P2PNode
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

async def test_generation():
    print("Starting test...")
    node = P2PNode(host='127.0.0.1', port=0)
    await node.start()
    print("Node started")
    
    # Connect to bootstrap
    await node.connect_bootstrap('ws://127.0.0.1:4003')
    print("Connected to bootstrap")
    
    # Wait for provider discovery
    await asyncio.sleep(3)
    
    # Check providers
    providers = node.list_providers()
    print(f"Found providers: {providers}")
    
    # Pick best provider
    best = node.pick_provider('distilgpt2')
    print(f"Best provider: {best}")
    
    if best:
        pid, provider_info = best
        print(f"Using provider {pid} with info: {provider_info}")
        
        try:
            print("Requesting generation...")
            result = await node.request_generation(
                pid, 
                'Hello, how are you?', 
                max_new_tokens=10, 
                model_name='distilgpt2'
            )
            print(f"Generation result: {result}")
        except Exception as e:
            print(f"Generation error: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("No provider found!")
    
    await node.stop()
    print("Node stopped")

if __name__ == "__main__":
    asyncio.run(test_generation())