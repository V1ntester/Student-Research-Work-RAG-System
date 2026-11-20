import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from benchmarks.metrics import summarize
from benchmarks.runner import run_benchmark


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="Call Groq up to once per case")
    parser.add_argument("--depth", type=int, default=5)
    parser.add_argument("--score", type=Path, help="Score a reviewed report without API calls")
    args = parser.parse_args()

    if args.score:
        report = json.loads(args.score.read_bytes())
        if not report["live"]:
            parser.error("Only a live run can be graded")

        rows = report["rows"]
        if any(type(r["correct"]) is not bool for r in rows):
            parser.error("Mark every row correct=true/false before scoring")
        if any(r.get("error") and r["correct"] for r in rows):
            parser.error("Technical errors must be marked incorrect")

        report["metrics"] = summarize(rows)
        out = args.score.with_suffix(".scored.json")
    else:
        k = int(os.getenv("RAG_TOP_K", "5"))
        if min(k, args.depth) < 1:
            parser.error("k and MRR depth must be positive")
        if args.live and not os.getenv("GROQ_API_KEY"):
            parser.error("Set GROQ_API_KEY in .env and recreate backend before --live")

        report = run_benchmark(k, args.depth, args.live)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        out = Path(os.getenv("REPORT_DIR", "/reports")) / f"{stamp}-{uuid4().hex[:8]}.json"

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(out, report["metrics"])


if __name__ == "__main__":
    main()
