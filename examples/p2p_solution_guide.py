"""Inspect a local Bee2Bee node and route a prompt to an available provider."""

import asyncio

from rich.console import Console
from rich.table import Table

from bee2bee.p2p_runtime import P2PNode

console = Console()


async def main() -> None:
    node = P2PNode(host="127.0.0.1", port=0)
    await node.start()

    try:
        table = Table(title="Connected peers")
        table.add_column("Peer")
        table.add_column("Models")
        table.add_column("Region")
        for peer_id, info in node.peers.items():
            table.add_row(
                peer_id,
                ", ".join(info.get("models") or []),
                info.get("region", "-"),
            )
        console.print(table)

        model = "llama3"
        provider = node.pick_provider(model)
        if not provider:
            console.print(f"[yellow]No provider for {model}.[/yellow]")
            return

        provider_id, _ = provider
        result = await node.request_generation(
            provider_id, "What is the future of P2P AI?", model_name=model
        )
        console.print(result)
    finally:
        await node.stop()


if __name__ == "__main__":
    asyncio.run(main())
