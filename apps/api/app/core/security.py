from fastapi import Header, HTTPException

from app.config import get_settings


async def verify_internal(x_internal_secret: str | None = Header(None)) -> None:
    """Blocks all calls that don't carry the shared BFF→API secret."""
    if x_internal_secret != get_settings().api_internal_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")
