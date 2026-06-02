import os

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


security = HTTPBearer()
DEFAULT_JWT_SECRET = "dev-secret"
JWT_SECRET = os.getenv("JWT_SECRET")

if not JWT_SECRET or JWT_SECRET == DEFAULT_JWT_SECRET:
    raise RuntimeError("JWT_SECRET must be set to a non-default value")


async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    try:
        payload = jwt.decode(token.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
        ) from exc
    return str(payload.get("sub") or payload.get("user_id") or "service")
