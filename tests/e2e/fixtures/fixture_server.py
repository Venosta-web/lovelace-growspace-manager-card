"""Fixture server for E2E tests.

This server provides HTTP endpoints for creating and cleaning up
Home Assistant config entries during E2E tests.
"""

import logging
from aiohttp import web


_LOGGER = logging.getLogger(__name__)


class FixtureServer:
    """Server for managing test fixtures."""

    def __init__(self, host: str = "localhost", port: int = 8124) -> None:
        """Initialize the fixture server."""
        self.host = host
        self.port = port
        self.app = web.Application()
        self._setup_routes()

    def _setup_routes(self) -> None:
        """Set up HTTP routes."""
        self.app.router.add_get("/health", self.health)
        self.app.router.add_post("/api/fixture/create", self.create_fixture)
        self.app.router.add_delete(
            "/api/fixture/cleanup/{config_entry_id}", self.cleanup_fixture
        )

    async def health(self, request: web.Request) -> web.Response:
        """Health check endpoint."""
        return web.json_response({"status": "ok"})

    async def create_fixture(self, request: web.Request) -> web.Response:
        """Create a new test fixture with config entry.

        Expected JSON body:
        {
            "fixture_type": "basic" | "multi_growspace" | "with_plants",
            "growspaces": [...],  # optional
            "plants": [...]  # optional
        }

        Returns:
        {
            "config_entry_id": "...",
            "growspaces": [...],
            "plants": [...]
        }
        """
        # TODO: Implement actual fixture creation
        data = await request.json()
        _LOGGER.info("Creating fixture: %s", data)

        return web.json_response({
            "config_entry_id": "stub_entry_id",
            "growspaces": [],
            "plants": []
        })

    async def cleanup_fixture(self, request: web.Request) -> web.Response:
        """Clean up a test fixture.

        Args:
            config_entry_id: ID of the config entry to remove

        Returns:
        {
            "status": "cleaned"
        }
        """
        # TODO: Implement actual cleanup
        config_entry_id = request.match_info["config_entry_id"]
        _LOGGER.info("Cleaning up fixture: %s", config_entry_id)

        return web.json_response({"status": "cleaned"})

    async def start(self) -> None:
        """Start the fixture server."""
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(runner, self.host, self.port)
        await site.start()
        _LOGGER.info("Fixture server running on http://%s:%d", self.host, self.port)


def main() -> None:
    """Run the fixture server."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    server = FixtureServer()

    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        loop.run_until_complete(server.start())
        loop.run_forever()
    except KeyboardInterrupt:
        _LOGGER.info("Shutting down fixture server")
    finally:
        loop.close()


if __name__ == "__main__":
    main()
