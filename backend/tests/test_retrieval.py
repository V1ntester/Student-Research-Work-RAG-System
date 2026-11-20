import json
import tempfile
import unittest
from pathlib import Path

from benchmarks.metrics import retrieval_scores
from services.retrieval import build_index, rank
from storage.indexes import load_index


class RetrievalTest(unittest.TestCase):
    def test_document_statistics_and_ties(self):
        docs = [
            {"id": "D01", "title": "А", "text": "ёж ёж"},
            {"id": "D02", "title": "Б", "text": "еж"},
            {"id": "D03", "title": "В", "text": "сад"},
        ]

        idx = build_index(docs)

        self.assertEqual(idx["postings"]["еж"], {"D01": 2, "D02": 1})
        self.assertAlmostEqual(idx["mean_length"], 7 / 3)
        self.assertEqual(rank(idx, "ёж"), ["D01", "D02"])
        self.assertEqual(rank(idx, "океан"), [])
        self.assertEqual(rank(idx, "Б В"), ["D02", "D03"])

    def test_snapshot_reuse_and_mode_isolation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for mode, word in [("ask", "дом"), ("sell", "гараж")]:
                (root / (mode + ".json")).write_text(json.dumps(
                    [{"id": "D01", "title": word, "text": word}]))

            cache = root / "cache"
            a = load_index("ask", root, cache)
            b = load_index("sell", root, cache)
            self.assertEqual(rank(b, "дом"), [])
            self.assertNotEqual(a["version"], b["version"])
            self.assertEqual(load_index("ask", root, cache), a)

    def test_metrics(self):
        self.assertEqual(retrieval_scores(["D04", "D02", "D01"], ["D01", "D02"], 2, 3),
                         {"recall": 0.5, "reciprocal_rank": 0.5})
        self.assertEqual(retrieval_scores(["D01"], [], 5, 5), {})
