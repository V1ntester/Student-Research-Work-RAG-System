def retrieval_scores(ranked, relevant, k, depth):
    if not relevant:
        return {}

    recall = len(set(ranked[:k]).intersection(relevant)) / len(relevant)
    rr = next((1 / pos for pos, key in enumerate(ranked[:depth], 1) if key in relevant), 0)
    return {"recall": recall, "reciprocal_rank": rr}


def summarize(rows):
    ordinary = [r for r in rows if r["relevant"]]
    traps = [r for r in rows if not r["relevant"]]

    def accuracy(group):
        if any(type(r["correct"]) is not bool for r in group):
            return None
        return sum(r["correct"] for r in group) / len(group)

    return {
        "Recall@k": sum(row["recall"] for row in ordinary) / len(ordinary),
        "MRR": sum(row["reciprocal_rank"] for row in ordinary) / len(ordinary),
        "Accuracy": accuracy(ordinary),
        "Correct Rejection Rate": accuracy(traps),
    }
