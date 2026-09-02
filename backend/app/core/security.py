from fastapi import Header, HTTPException, status
from app.core.config import settings

def verify_token(authorization: str = Header(None)):
    """
    Optional token validation utility. If needed in production, 
    verifies the Bearer JWT token against Supabase auth.
    """
    if not authorization:
        return None
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected Bearer <token>"
        )
    
    token = parts[1]
    # In a full-blown deployment, you can verify this token with supabase.auth.get_user(token)
    return token
