from providers.groq import generate
from schemas.reply import REASONS


def answer(index, question, ranked, k):
    sources = []

    for position, key in enumerate(ranked[:k], start=1):
        document = index["docs"][key]
        sources.append({
            "citation_id": f"S{position}",
            "document_id": document["id"],
            "title": document["title"],
            "excerpt": document["text"],
        })

    if sources:
        outcome, message, used = generate(question, sources)
        reason = REASONS[outcome]
    else:
        outcome = "insufficient"
        reason = "no_candidates"
        message = "В документах нет этой информации."
        used = []

    return {
        "mode": index["mode"],
        "index_version": index["version"],
        "outcome": outcome,
        "reason": reason,
        "message": message,
        "sources": used,
    }
