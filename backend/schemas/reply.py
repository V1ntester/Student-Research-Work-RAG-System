import re

from core.errors import ServiceError


REASONS = {
    "answer": None,
    "partial": "incomplete_context",
    "insufficient": "insufficient_context",
    "clarification": "ambiguous_question",
    "conflict": "conflicting_context",
}


def response_format(sources):
    source_ids = [source["citation_id"] for source in sources]
    part = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "text": {"type": "string"},
            "citation_ids": {
                "type": "array",
                "items": {"type": "string", "enum": source_ids},
            },
        },
        "required": ["text", "citation_ids"],
    }

    schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "outcome": {"type": "string", "enum": list(REASONS)},
            "parts": {"type": "array", "items": part},
        },
        "required": ["outcome", "parts"],
    }
    return {
        "type": "json_schema",
        "json_schema": {"name": "grounded_answer", "strict": True, "schema": schema},
    }


def format_reply(data, sources):
    outcome = data["outcome"]
    parts = data["parts"]

    if outcome not in REASONS or not isinstance(parts, list) or not parts:
        raise ValueError("Invalid outcome or empty reply")

    allowed = {source["citation_id"] for source in sources}
    cited = set()
    paragraphs = []

    for part in parts:
        text = part["text"]
        ids = part["citation_ids"]

        if not isinstance(text, str) or not text.strip() or not isinstance(ids, list):
            raise ValueError("Invalid reply part")
        if not set(ids) <= allowed or re.search(r"\[S\d+\]", text):
            raise ValueError("Invalid citation")

        cited.update(ids)
        markers = [f"[{source_id}]" for source_id in dict.fromkeys(ids)]
        paragraphs.append(" ".join([text.strip(), *markers]))

    if outcome in ("answer", "partial", "conflict") and not cited:
        raise ServiceError(502, "INVALID_LLM_RESPONSE", "Модель не указала источник ответа.")

    used_sources = [source for source in sources if source["citation_id"] in cited]
    return outcome, "\n".join(paragraphs), used_sources
