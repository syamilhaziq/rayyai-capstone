from __future__ import annotations

from typing import Optional
import logging

from fastapi import FastAPI

logger = logging.getLogger(__name__)

# Try to import MCP, but make it optional
try:
    from mcp.server.fastmcp import FastMCP
    from services.mcp_tools import register_tools
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False
    FastMCP = None  # type: ignore
    logger.warning("MCP module not available. MCP features will be disabled. Install with: pip install mcp")

MCP_MOUNT_PATH = "/mcp"
MCP_STREAMABLE_HTTP_PATH = "/mcp"


def _create_server() -> Optional[FastMCP]:
    """Create the shared FastMCP server instance."""
    if not MCP_AVAILABLE:
        return None
    
    return FastMCP(
        name="RayyAI Database MCP",
        instructions=(
            "Tools for the RayyAI Gemini agent to perform vetted Postgres and MongoDB"
            " operations. All requests must respect security and validation rules."
        ),
        mount_path=MCP_MOUNT_PATH,
        streamable_http_path=MCP_STREAMABLE_HTTP_PATH,
        debug=False,
    )


_mcp_server: Optional[FastMCP] = None


def get_mcp_server() -> Optional[FastMCP]:
    """Return (and lazily create) the singleton MCP server."""
    if not MCP_AVAILABLE:
        return None
    
    global _mcp_server  # noqa: PLW0603
    if _mcp_server is None:
        _mcp_server = _create_server()
        if _mcp_server is not None:
            register_tools(_mcp_server)
    return _mcp_server


def mount_mcp(app: FastAPI) -> None:
    """Mount the MCP server's Streamable HTTP transport onto the FastAPI app."""
    if not MCP_AVAILABLE:
        logger.info("MCP not available, skipping MCP mount")
        return
    
    server = get_mcp_server()
    if server is not None:
        app.mount(MCP_STREAMABLE_HTTP_PATH, server.streamable_http_app())
        logger.info("MCP server mounted successfully")
    else:
        logger.warning("MCP server could not be created")
