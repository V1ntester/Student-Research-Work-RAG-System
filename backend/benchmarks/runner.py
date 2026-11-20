import hashlib
import json
import os
from pathlib import Path

from benchmarks.metrics import retrieval_scores, summarize
from core.errors import ServiceError
from providers.groq import MODEL, PROMPT_VERSION
from services.chat import answer
from services.retrieval import rank
from storage.indexes import load_indexes


def validate(cases, indexes):
    ids = [key for idx in indexes.values() for key in idx["docs"]]
    if sorted(ids) != [f"D{i:02}" for i in range(1, 31)]:
        raise ValueError("Expected D01 through D30 once across both modes")
    if len(cases) != 15 or len({c["id"] for c in cases}) != 15:
        raise ValueError("Expected 15 distinct cases")
    if sum(bool(c["relevant"]) for c in cases) != 10:
        raise ValueError("Expected 10 answerable questions and 5 traps")
    for case in cases:
        gold = set(case["relevant"])
        if gold and (len(gold) < 3 or not gold <= indexes[case["mode"]]["docs"].keys()):
            raise ValueError("Invalid relevance labels for " + case["id"])



def run_case(case, index, k, depth, live):
    ranked = rank(index, case["question"])
    scores = retrieval_scores(ranked, case["relevant"], k, depth)
    row = dict(case, ranked=ranked, correct=None, **scores)

    if live:
        row["context"] = [index["docs"][key] for key in ranked[:k]]
        try:
            row["result"] = answer(index, case["question"], ranked, k)
        except ServiceError as exc:
            row.update(error=exc.code, correct=False, detail=str(exc))

    return row


def run_benchmark(k, depth, live):
    raw = Path(os.getenv("CASES_FILE", "/evaluation/cases.json")).read_bytes()
    cases = json.loads(raw)
    indexes = load_indexes()
    validate(cases, indexes)

    rows = [run_case(case, indexes[case["mode"]], k, depth, live) for case in cases]

    return {
        "live": live,
        "k": k,
        "mrr_depth": depth,
        "model": MODEL if live else None,
        "prompt": PROMPT_VERSION,
        "dataset_sha256": hashlib.sha256(raw).hexdigest(),
        "indexes": {mode: index["version"] for mode, index in indexes.items()},
        "rows": rows,
        "metrics": summarize(rows),
    }
