import hashlib
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile

from services.retrieval import build_index


MODES = ("ask", "sell")
INDEX_SCHEMA = "document-bm25-v1"


def load_index(mode, corpus, cache):
    raw = (corpus / f"{mode}.json").read_bytes()
    version = hashlib.sha256(INDEX_SCHEMA.encode() + mode.encode() + raw).hexdigest()
    target = cache / f"{version}.json"

    if target.exists():
        return json.loads(target.read_bytes())

    snapshot = build_index(json.loads(raw))
    snapshot.update(version=version, mode=mode)
    cache.mkdir(parents=True, exist_ok=True)

    with NamedTemporaryFile(dir=cache, mode="w", encoding="utf-8", delete=False) as temp:
        json.dump(snapshot, temp, ensure_ascii=False)

    os.replace(temp.name, target)
    return snapshot


def load_indexes():
    corpus = Path(os.getenv("CORPUS_DIR", "/data/corpus"))
    cache = Path(os.getenv("INDEX_DIR", "/data/indexes"))

    return {mode: load_index(mode, corpus, cache) for mode in MODES}
