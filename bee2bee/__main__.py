from __future__ import annotations

import asyncio
import os
import sys

import click
from dotenv import load_dotenv
from loguru import logger
from rich.console import Console
from rich.table import Table

load_dotenv()

from .config import get_bootstrap_url, load_config, save_config
from .p2p import parse_join_link
from .p2p_runtime import run_p2p_node
from .registry import RegistryClient

logger.remove()
logger.add(sys.stderr, level=os.getenv("LOG_LEVEL", "INFO"))
logger.add("bee2bee.log", rotation="10 MB", level="DEBUG")

console = Console()


@click.group()
def cli():
    """Bee2Bee: local-first P2P mesh for AI inference."""


@cli.command("serve-ollama")
@click.option("--model", default="llama3", help="Ollama model name")
@click.option("--host", default="0.0.0.0", help="Bind host")
@click.option("--port", default=0, type=int, help="P2P bind port")
@click.option("--public-host", default=None, help="Address advertised to peers")
@click.option("--region", default="Local", help="Region label")
@click.option("--api-port", default=4002, type=int, help="Local HTTP API port")
@click.option("--endpoint", default=None, help="Ollama endpoint (default http://localhost:11434)")
def serve_ollama(model, host, port, public_host, region, api_port, endpoint):
    """Serve a local Ollama model to the mesh."""
    asyncio.run(
        run_p2p_node(
            host=host,
            port=port,
            bootstrap_link=get_bootstrap_url(),
            model_name=model,
            backend="ollama",
            announce_host=public_host,
            region=region,
            api_port=api_port,
            endpoint=endpoint,
        )
    )


@cli.command("serve-hf")
@click.option("--model", default="distilgpt2", help="Hugging Face model name")
@click.option("--host", default="0.0.0.0", help="Bind host")
@click.option("--port", default=0, type=int, help="P2P bind port")
@click.option("--region", default="Local", help="Region label")
@click.option("--api-port", default=4002, type=int, help="Local HTTP API port")
def serve_hf(model, host, port, region, api_port):
    """Serve a local Hugging Face model to the mesh."""
    asyncio.run(
        run_p2p_node(
            host=host,
            port=port,
            bootstrap_link=get_bootstrap_url(),
            model_name=model,
            backend="hf",
            region=region,
            api_port=api_port,
        )
    )


@cli.command("serve-hf-remote")
@click.option("--model", default="HuggingFaceH4/zephyr-7b-beta", help="HF model name")
@click.option("--token", default=None, help="HF API token (or HUGGING_FACE_HUB_TOKEN)")
@click.option("--region", default="Cloud", help="Region label")
@click.option("--api-port", default=4002, type=int, help="Local HTTP API port")
def serve_hf_remote(model, token, region, api_port):
    """Proxy a model through the Hugging Face Inference API."""
    if token:
        os.environ["HUGGING_FACE_HUB_TOKEN"] = token
    asyncio.run(
        run_p2p_node(
            bootstrap_link=get_bootstrap_url(),
            model_name=model,
            backend="hf_remote",
            region=region,
            api_port=api_port,
        )
    )


@cli.command("api")
@click.option("--host", default="127.0.0.1", help="Bind host")
@click.option("--port", default=4002, type=int, help="HTTP API port")
@click.option("--p2p-port", default=4003, type=int, help="P2P WebSocket port")
def api_command(host, port, p2p_port):
    """Run a local node with its HTTP API only."""
    asyncio.run(
        run_p2p_node(
            host=host,
            port=p2p_port,
            bootstrap_link=get_bootstrap_url(),
            api_port=port,
        )
    )


@cli.command()
@click.option("--model", default=None, help="Model to serve (optional)")
@click.option("--backend", default="ollama", type=click.Choice(["ollama", "hf", "hf_remote"]))
@click.option("--region", default="Local", help="Region label")
@click.option("--host", default="127.0.0.1", help="Bind host")
@click.option("--port", default=4003, type=int, help="P2P bind port")
@click.option("--api-port", default=4002, type=int, help="Local HTTP API port")
@click.option("--endpoint", default=None, help="Backend endpoint (Ollama)")
@click.option("--bootstrap", default=None, help="Bootstrap ws:// address")
def tui(model, backend, region, host, port, api_port, endpoint, bootstrap):
    """Open the terminal dashboard (TUI)."""
    from .tui import run_tui

    asyncio.run(
        run_tui(
            model_name=model,
            backend=backend,
            region=region,
            host=host,
            port=port,
            api_port=api_port,
            endpoint=endpoint,
            bootstrap=bootstrap or get_bootstrap_url(),
        )
    )


@cli.command()
@click.option("--node-url", default=None, help="Register a specific ws:// address")
@click.option("--region", default="Local", help="Region label")
def register(node_url, region):
    """Show the local registry or add a node address to it."""

    async def _register():
        registry = RegistryClient()
        if not node_url:
            nodes = await registry.list_nodes()
            if not nodes:
                console.print("[yellow]Local registry is empty. Start a node first.[/yellow]")
                return
            table = Table(title="Local Bee2Bee registry", show_lines=False)
            table.add_column("Peer", style="cyan")
            table.add_column("Address")
            table.add_column("Models", style="green")
            table.add_column("Region")
            for item in nodes:
                table.add_row(
                    item.get("peer_id", "?"),
                    item.get("addr", "?"),
                    ", ".join(item.get("models") or []),
                    item.get("region", "-"),
                )
            console.print(table)
            return

        address = node_url
        if address.startswith("bee2bee://"):
            parsed = parse_join_link(address)
            address = (parsed.get("bootstrap") or [""])[0]
        ok = await registry.sync_node(
            peer_id=address.replace("ws://", "").replace("wss://", ""),
            address=address,
            models=[],
            tag="manual",
            region=region,
        )
        if ok:
            console.print(f"[green]Registered {address}[/green]")
        else:
            console.print("[red]Local registry is disabled (BEE2BEE_LOCAL_REGISTRY=0).[/red]")

    asyncio.run(_register())


@cli.command("config")
@click.argument("key", required=False)
@click.argument("value", required=False)
def config_command(key, value):
    """View or update local configuration."""
    cfg = load_config()
    if not key:
        for name, current in cfg.items():
            console.print(f"[cyan]{name}[/cyan] = {current}")
        return
    if value is None:
        console.print(cfg.get(key, ""))
        return
    cfg[key] = value
    save_config(cfg)
    console.print(f"[green]{key}[/green] = {value}")


@cli.command("status")
def status_command():
    """Print a short summary of the local node and registry."""
    registry = RegistryClient()
    nodes = registry.list_nodes_sync()
    console.print(f"[bold]Registry:[/bold] {registry.path}")
    console.print(f"[bold]Active entries:[/bold] {len(nodes)}")
    for item in nodes:
        console.print(f"  • {item.get('peer_id')} {item.get('addr')}")


def main():
    cli()


if __name__ == "__main__":
    cli()
