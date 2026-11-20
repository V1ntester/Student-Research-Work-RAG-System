import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.routes import router, service_error
from core.errors import ServiceError
from storage.indexes import load_indexes


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.indexes = load_indexes()
    app.state.k = int(os.getenv("RAG_TOP_K", "5"))

    if app.state.k < 1:
        raise ValueError("RAG_TOP_K must be positive")

    yield


app = FastAPI(
    title="Student Research RAG",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
app.add_exception_handler(ServiceError, service_error)
app.include_router(router)
