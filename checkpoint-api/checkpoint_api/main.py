import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers.checkpoints import router as checkpoints_router


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
    return app


Base.metadata.create_all(bind=engine)
app = create_app()
