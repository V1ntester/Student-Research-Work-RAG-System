import json
from uuid import uuid4

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from core.errors import ServiceError
from services.chat import answer
from services.retrieval import rank


router = APIRouter(prefix="/api")


async def service_error(request: Request, exc: ServiceError):
    return JSONResponse(
        status_code=exc.status,
        content={
            "request_id": request.state.request_id,
            "error": {"code": exc.code, "message": str(exc)},
        },
    )


async def read_question(request: Request):
    media_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
    if media_type != "application/json":
        raise ServiceError(415, "UNSUPPORTED_MEDIA_TYPE", "Ожидается JSON.")

    body = bytearray()
    async for chunk in request.stream():
        if len(body) + len(chunk) > 32768:
            raise ServiceError(413, "PAYLOAD_TOO_LARGE", "Слишком большой запрос.")
        body.extend(chunk)

    try:
        data = json.loads(body)
    except (ValueError, RecursionError):
        raise ServiceError(400, "INVALID_REQUEST", "Некорректный JSON.") from None

    if not isinstance(data, dict) or data.keys() - {"question", "mode"}:
        raise ServiceError(400, "INVALID_REQUEST", "Ожидаются вопрос и режим.")

    mode = data.get("mode")
    if not isinstance(mode, str) or mode not in request.app.state.indexes:
        raise ServiceError(400, "INVALID_MODE", "Выберите режим.")

    question = data.get("question")
    if not isinstance(question, str) or not question.strip():
        raise ServiceError(400, "INVALID_QUESTION", "Введите вопрос.")

    question = question.strip()
    if len(question) > 2000:
        raise ServiceError(400, "QUESTION_TOO_LONG", "Сократите вопрос до 2000 символов.")

    return mode, question


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/chat/query")
async def query(request: Request):
    request.state.request_id = str(uuid4())
    mode, question = await read_question(request)

    index = request.app.state.indexes[mode]
    ranked = rank(index, question)
    result = await run_in_threadpool(answer, index, question, ranked, request.app.state.k)

    return {**result, "request_id": request.state.request_id}
