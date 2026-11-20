import io
import json
import unittest
from unittest.mock import patch

from core.errors import ServiceError
from services.chat import answer
from services.retrieval import build_index


class GenerationTest(unittest.TestCase):
    def setUp(self):
        documents = [{"id": "D01", "title": "Показ", "text": "Начало в полдень."}]
        self.idx = dict(build_index(documents), version="test", mode="ask")

    def test_empty_skips_provider(self):
        with patch("providers.groq.urlopen") as call:
            self.assertEqual(answer(self.idx, "океан", [], 5)["reason"], "no_candidates")
            call.assert_not_called()

    @patch.dict("os.environ", {"GROQ_API_KEY": "test-only"})
    def test_citations(self):
        for marker in ["S1", "S9"]:
            content = json.dumps({
                "outcome": "answer",
                "parts": [{"text": "В полдень.", "citation_ids": [marker]}],
            })
            wire = json.dumps({"choices": [{"message": {"content": content}}]}).encode()

            with patch("providers.groq.urlopen", return_value=io.BytesIO(wire)):
                if marker == "S1":
                    result = answer(self.idx, "Когда показ?", ["D01"], 5)
                    self.assertEqual(result["message"], "В полдень. [S1]")
                    self.assertEqual(result["sources"][0]["document_id"], "D01")
                else:
                    with self.assertRaises(ServiceError):
                        answer(self.idx, "Когда показ?", ["D01"], 5)
