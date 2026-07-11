from fastapi import APIRouter

from .auth import router as auth_router
from .analysis import router as analysis_router
from .user import router as user_router
from .credits import router as credits_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(analysis_router)
api_router.include_router(user_router)
api_router.include_router(credits_router)
