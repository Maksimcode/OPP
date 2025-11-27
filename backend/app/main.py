from fastapi import FastAPI

from app.api.v1 import auth
from app.db.base import Base
from app.db.session import engine
from app.models import student  


def create_application() -> FastAPI:
    app = FastAPI(title="Reverse Gantt", version="0.1.0")

    Base.metadata.create_all(bind=engine)

    app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])

    return app


app = create_application()
