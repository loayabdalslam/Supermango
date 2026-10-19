# Bee2Bee local commands

# 1. Start a mesh/API node
python -m bee2bee api --host 127.0.0.1 --port 4002 --p2p-port 4003

# 2. Start a model provider
python -m bee2bee serve-ollama --model llama3 --host 127.0.0.1 --port 4003 --api-port 4002

# 3. Terminal dashboard
python -m bee2bee tui --model llama3 --backend ollama

# 4. Web app
cd app && npm run dev

# 5. Tests
python -m pytest
