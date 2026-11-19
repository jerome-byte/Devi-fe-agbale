from typing import Annotated

from fastapi import Header, HTTPException, Request


def admin(request: Request, authorization: Annotated[str | None, Header()] = None) -> None:
    """Exige `Authorization: Bearer <ADMIN_TOKEN>`. Le jeton ne doit vivre que sur des serveurs."""
    jeton = request.app.state.settings.admin_token
    if not jeton:
        raise HTTPException(503, "ADMIN_TOKEN non configuré")
    if authorization != f"Bearer {jeton}":
        raise HTTPException(401, "jeton invalide")
