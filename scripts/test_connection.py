#!/usr/bin/env python3
"""
Simple test script to debug P2P connection issues
"""

import asyncio
import websockets
import json

async def test_connection():
    uri = "ws://127.0.0.1:4003"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected successfully!")
            
            # Send hello message
            hello_msg = {
                "type": "hello",
                "peer_id": "test-client",
                "addr": "ws://test-client",
                "services": {}
            }
            
            print(f"Sending hello: {hello_msg}")
            await websocket.send(json.dumps(hello_msg))
            
            # Wait for response
            print("Waiting for response...")
            response = await websocket.recv()
            print(f"Received: {response}")
            
            # Parse response
            try:
                data = json.loads(response)
                print(f"Parsed response: {data}")
            except json.JSONDecodeError as e:
                print(f"Failed to parse JSON: {e}")
                
    except Exception as e:
        print(f"Connection failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_connection())