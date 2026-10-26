import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from . import run_log

from .database import Base, engine
from .migrate import upgrade_stage_tables
from .stage_pipeline import upload_dir
from .routers.assessments import router as assessments_router
from .routers.auth import router as auth_router
from .routers.boundary import router as boundary_router
from .routers.checkpoints import router as checkpoints_router
from .routers.pipeline import router as pipeline_router
from .routers.pipeline_v2 import router as pipeline_v2_router
from .routers.stages import router as stages_router
from .routers.uploads import router as uploads_router


log = run_log.get("http")


def create_app() -> FastAPI:
    app = FastAPI(title="TARA Checkpoint API")

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        # Method, path, status and time only: never bodies, tokens or passwords.
        started = time.monotonic()
        try:
            response = await call_next(request)
        except Exception:
            log.exception("%s %s failed after %d ms", request.method, request.url.path, (time.monotonic() - started) * 1000)
            raise
        level = log.warning if response.status_code >= 500 else log.info
        level("%s %s %d %d ms", request.method, request.url.path, response.status_code, (time.monotonic() - started) * 1000)
        return response

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
    app.include_router(boundary_router, tags=["boundary"])
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(assessments_router, prefix="/api/v1/assessments", tags=["assessments"])
    app.include_router(pipeline_router, prefix="/api/v1/assessments", tags=["pipeline"])
    app.include_router(uploads_router, prefix="/api/v1/assessments", tags=["uploads"])
    app.include_router(stages_router, prefix="/api/v1/assessments", tags=["stages"])
    app.include_router(pipeline_v2_router, prefix="/api/v1/assessments", tags=["pipeline-v2"])
    return app


LOG_PATH = run_log.setup()
run_log.get("startup").info("API starting; run log at %s", LOG_PATH)
run_log.get("startup").info("Uploads and run folders at %s", upload_dir())
Base.metadata.create_all(bind=engine)
upgrade_stage_tables(engine)
app = create_app()
