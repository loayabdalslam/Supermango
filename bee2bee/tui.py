from __future__ import annotations

import asyncio
import os
import sys
import time
from collections import deque
from contextlib import contextmanager
from typing import Deque, Optional

from loguru import logger
from rich.console import Console, Group
from rich.live import Live
from rich.markdown import Markdown
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .p2p_runtime import P2PNode, build_service
from .utils import get_system_metrics

console = Console()

RECENT_LOGS: Deque[str] = deque(maxlen=8)


def _log_sink(message) -> None:
    RECENT_LOGS.append(str(message).rstrip())


@contextmanager
def _raw_keys():
    """Put the terminal in a mode where single key presses are delivered."""
    if os.name == "nt":
        yield
        return

    import termios
    import tty

    fd = sys.stdin.fileno()
    previous = termios.tcgetattr(fd)
    try:
        tty.setcbreak(fd)
        yield
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, previous)


def _read_key() -> Optional[str]:
    if os.name == "nt":
        import msvcrt

        if msvcrt.kbhit():
            try:
                return msvcrt.getwch().lower()
            except Exception:
                return None
        return None

    import select

    if select.select([sys.stdin], [], [], 0)[0]:
        return sys.stdin.read(1).lower()
    return None


def _status_dot(ok: bool) -> Text:
    return Text("*", style="bold green" if ok else "bold red")


class Dashboard:
    def __init__(self, node: P2PNode, started_at: float):
        self.node = node
        self.started_at = started_at

    def _header(self) -> Panel:
        peers = len(self.node.peers)
        services = len(self.node.local_services)
        status = _status_dot(self.node._running)
        line = Text.assemble(
            ("BEE2BEE", "bold black on yellow"),
            ("  local terminal dashboard", "dim"),
            ("    ", ""),
            status,
            (f"  peers {peers}  ·  services {services}", ""),
        )
        return Panel(line, border_style="yellow", padding=(0, 1))

    def _identity(self) -> Panel:
        table = Table.grid(padding=(0, 1))
        table.add_column(style="dim", justify="right")
        table.add_column()

        uptime = int(time.time() - self.started_at)
        minutes, seconds = divmod(uptime, 60)
        hours, minutes = divmod(minutes, 60)
        metrics = get_system_metrics()

        table.add_row("peer id", self.node.peer_id)
        table.add_row("address", self.node.addr or "-")
        table.add_row("region", self.node.region)
        table.add_row(
            "api",
            f"http://{getattr(self.node, 'api_host', None) or self.node.host}:{getattr(self.node, 'api_port', '-')}",
        )
        table.add_row("uptime", f"{hours:02d}:{minutes:02d}:{seconds:02d}")
        table.add_row("cpu load", f"{metrics.get('throughput', 0)} %")
        table.add_row("memory", f"{metrics.get('memory_percent', 0)} %")
        table.add_row("gpu", f"{metrics.get('gpu_percent', 0)} %")
        return Panel(table, title="Node", border_style="cyan", padding=(0, 1))

    def _services(self) -> Panel:
        table = Table(expand=True, box=None, padding=(0, 1))
        table.add_column("Service", style="magenta")
        table.add_column("Models", style="green")
        table.add_column("Backend", style="dim")
        for name, service in self.node.local_services.items():
            meta = service.get_metadata()
            table.add_row(
                name,
                ", ".join(meta.get("models") or ["-"]),
                str(meta.get("backend") or meta.get("tag") or name),
            )
        if not self.node.local_services:
            table.add_row("-", "no local model loaded", "-")
        return Panel(table, title="Local services", border_style="magenta", padding=(0, 1))

    def _peers(self) -> Panel:
        table = Table(expand=True, box=None, padding=(0, 1))
        table.add_column("Peer", style="cyan", no_wrap=True)
        table.add_column("Address", style="dim", overflow="fold")
        table.add_column("RTT", justify="right")
        table.add_column("Models", style="green", overflow="fold")

        providers = self.node.providers
        for peer_id, info in list(self.node.peers.items())[:12]:
            models = []
            for service_name, meta in (providers.get(peer_id) or {}).items():
                if service_name.startswith("_") or not isinstance(meta, dict):
                    continue
                models.extend(meta.get("models") or [])
            rtt = info.get("last_pong_ms")
            table.add_row(
                peer_id,
                str(info.get("addr") or "-"),
                f"{rtt:.0f} ms" if rtt else "-",
                ", ".join(sorted(set(models))) or "-",
            )
        if not self.node.peers:
            table.add_row("-", "waiting for peers", "-", "-")
        return Panel(table, title="Mesh peers", border_style="green", padding=(0, 1))

    def _logs(self) -> Panel:
        body = Text("\n".join(RECENT_LOGS) if RECENT_LOGS else "no events yet")
        return Panel(body, title="Events", border_style="blue", padding=(0, 1))

    def _footer(self) -> Text:
        return Text.from_markup(
            "[bold yellow]q[/bold yellow] quit   "
            "[bold yellow]c[/bold yellow] chat   "
            "[bold yellow]r[/bold yellow] refresh   "
            "[dim]local web app: http://localhost:3000[/dim]"
        )

    def render(self):
        return Group(
            self._header(),
            self._identity(),
            self._services(),
            self._peers(),
            self._logs(),
            self._footer(),
        )


async def _chat(node: P2PNode, model_name: Optional[str]) -> None:
    if not node.local_services:
        console.print("[yellow]No local model is loaded. Start the TUI with --model.[/yellow]")
        console.input("[dim]Press Enter to continue...[/dim]")
        return

    prompt = console.input("\n[cyan]Prompt[/cyan] > ").strip()
    if not prompt:
        return

    with console.status("[yellow]Generating...[/yellow]"):
        try:
            result = await node.request_generation(
                provider_id=node.peer_id,
                prompt=prompt,
                max_new_tokens=1024,
                model_name=model_name,
            )
        except Exception as exc:
            console.print(f"[red]Generation failed: {exc}[/red]")
            console.input("[dim]Press Enter to continue...[/dim]")
            return

    text = result.get("text") or result.get("response") or ""
    console.print(Panel(Markdown(text or "_(empty response)_"), title="Response", border_style="green"))
    console.input("[dim]Press Enter to return to the dashboard...[/dim]")


async def run_tui(
    model_name: Optional[str] = None,
    backend: str = "ollama",
    region: str = "Auto",
    host: str = "0.0.0.0",
    port: int = 4003,
    api_port: Optional[int] = 4002,
    endpoint: Optional[str] = None,
    bootstrap: Optional[str] = None,
) -> None:
    # A stderr handler would write over the Rich Live screen. Route logs to the
    # dashboard events panel and the log file only.
    logger.remove()
    logger.add(_log_sink, level="INFO", format="{message}")
    logger.add("bee2bee.log", rotation="10 MB", level="DEBUG")

    node = P2PNode(host=host, port=port, region=region)
    node.api_port = api_port or 0
    node.api_host = host

    await node.start()
    node.api_host = getattr(node, "public_host", None) or host

    if api_port:
        import bee2bee.api
        import uvicorn

        bee2bee.api.node = node
        config = uvicorn.Config(
            bee2bee.api.app, host=host, port=api_port, log_level="warning"
        )
        asyncio.create_task(uvicorn.Server(config).serve())

    if bootstrap:
        try:
            await node.connect_bootstrap(bootstrap)
        except Exception as exc:
            logger.warning(f"Bootstrap failed: {exc}")

    if model_name:
        try:
            service = build_service(backend, model_name, endpoint=endpoint)
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, service.load_sync)
            await node.add_service(service)
        except Exception as exc:
            logger.error(f"Could not load {model_name}: {exc}")

    await node.enable_monitoring(interval_seconds=15)

    dashboard = Dashboard(node, started_at=time.time())
    running = True

    with _raw_keys():
        with Live(
            dashboard.render(),
            console=console,
            screen=True,
            refresh_per_second=4,
            transient=False,
        ) as live:
            while running:
                live.update(dashboard.render())
                key = _read_key()
                if key == "q":
                    running = False
                elif key == "c":
                    live.stop()
                    await _chat(node, model_name)
                    live.start(refresh=True)
                elif key == "r":
                    await node.sync_with_registry()
                await asyncio.sleep(0.2)

    await node.stop()
