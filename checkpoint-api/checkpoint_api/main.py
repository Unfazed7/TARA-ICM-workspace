import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers.assessments import router as assessments_router
from .routers.auth import router as auth_router
from .routers.checkpoints import router as checkpoints_router
from .routers.pipeline import router as pipeline_router
from .routers.uploads import router as uploads_router


def create_app() -> FastAPI:
    app = FastAPI(title="TARA Checkpoint API")
    allowed_origins = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(checkpoints_router)
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(assessments_router, prefix="/api/v1/assessments", tags=["assessments"])
    app.include_router(pipeline_router, prefix="/api/v1/assessments", tags=["pipeline"])
    app.include_router(uploads_router, prefix="/api/v1/assessments", tags=["uploads"])
    return app


Base.metadata.create_all(bind=engine)
app = create_app()
