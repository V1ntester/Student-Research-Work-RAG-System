import math
import re
from collections import Counter, defaultdict


K1 = 1.2
B = 0.75


def tokens(text):
    normalized = text.lower().replace("ё", "е")
    return re.findall(r"[а-яa-z0-9]+", normalized)


def build_index(documents):
    postings = defaultdict(dict)
    lengths = {}
    by_id = {}

    for document in documents:
        document_id = document["id"]
        if document_id in by_id or not re.fullmatch(r"D\d{2}", document_id):
            raise ValueError("Invalid or duplicate document ID")

        terms = tokens(document["title"] + " " + document["text"])
        if not terms:
            raise ValueError("Empty document")

        by_id[document_id] = document
        lengths[document_id] = len(terms)
        for term, count in Counter(terms).items():
            postings[term][document_id] = count

    if not by_id:
        raise ValueError("Empty corpus")

    return {
        "docs": by_id,
        "postings": postings,
        "lengths": lengths,
        "mean_length": sum(lengths.values()) / len(lengths),
    }


def rank(index, question):
    scores = defaultdict(float)
    document_count = len(index["docs"])

    for term in sorted(set(tokens(question))):
        posting = index["postings"].get(term, {})
        frequency = len(posting)
        idf = math.log1p((document_count - frequency + 0.5) / (frequency + 0.5))

        for document_id, tf in posting.items():
            norm = 1 - B + B * index["lengths"][document_id] / index["mean_length"]
            scores[document_id] += idf * tf * (K1 + 1) / (tf + K1 * norm)

    return sorted(scores, key=lambda document_id: (-scores[document_id], document_id))
