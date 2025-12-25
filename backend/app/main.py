from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, projects, teams
from app.db.base import Base
from app.db.session import engine
# Import models to ensure they are registered with Base.metadata
from app.models import project, student, team  # noqa: F401


def create_application() -> FastAPI:
    app = FastAPI(title="Reverse Gantt", version="0.1.0")

    # Create tables (in production use Alembic!)
    Base.metadata.create_all(bind=engine)

    # Configure CORS
    origins = [
        "http://localhost:5173",  # React default port
        "http://127.0.0.1:5173",
        "http://31.192.110.21",   # Production IP
        "http://31.192.110.21:5173",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(teams.router, prefix="/api/v1/teams", tags=["teams"])
    app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])

    return app


app = create_application()
