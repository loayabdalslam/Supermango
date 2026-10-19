FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY . .
RUN pip install --no-cache-dir .

ENV BEE2BEE_HOST=0.0.0.0
ENV BEE2BEE_PORT=4003
ENV BEE2BEE_API_PORT=4002
ENV BEE2BEE_NAT=0

EXPOSE 4002 4003

CMD ["python", "-m", "bee2bee", "api", "--host", "0.0.0.0", "--port", "4002", "--p2p-port", "4003"]
