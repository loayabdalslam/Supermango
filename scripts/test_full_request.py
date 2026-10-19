#!/usr/bin/env python3
"""
Test script to simulate full p2p-request workflow
"""

import asyncio
import websockets
import json
import time

async def test_full_request():
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
            
            # Wait for hello response
            print("Waiting for hello response...")
            response = await websocket.recv()
            print(f"Received hello: {response}")
            
            # Wait for peer_list
            print("Waiting for peer_list...")
            peer_list_response = await websocket.recv()
            print(f"Received peer_list: {peer_list_response}")
            
            # Wait for ping
            print("Waiting for ping...")
            ping_response = await websocket.recv()
            print(f"Received ping: {ping_response}")
            
            # Respond to ping with pong
            ping_data = json.loads(ping_response)
            if ping_data.get("type") == "ping":
                pong_msg = {"type": "pong", "ts": ping_data.get("ts")}
                print(f"Sending pong: {pong_msg}")
                await websocket.send(json.dumps(pong_msg))
            
            # Now send a generation request
            generation_request = {
                "type": "gen_request",
                "rid": "test-request-123",
                "model": "distilgpt2",
                "prompt": "Hello, how are you?",
                "max_new_tokens": 10
            }
            
            print(f"Sending generation request: {generation_request}")
            await websocket.send(json.dumps(generation_request))
            
            # Wait for generation response
            print("Waiting for generation response...")
            gen_response = await websocket.recv()
            print(f"Received generation response: {gen_response}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_full_request())