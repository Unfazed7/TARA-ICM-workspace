#!/usr/bin/env bash
# Token usage (and cost, if you give prices) per stage and per model, from the model-call audit log.
# Usage (in /opt/tara on the server):
#   ./llm-usage.sh                      # tokens only
#   ./llm-usage.sh 0.50 1.50            # price per 1M input / 1M output tokens -> adds cost
#   SINCE=2026-11-13T10:00 ./llm-usage.sh 0.50 1.50   # only calls after this UTC time
set -euo pipefail
cd /opt/tara
docker compose exec -T -e PIN="${1:-}" -e POUT="${2:-}" -e SINCE="${SINCE:-}" api python -c '
import json, os, collections
f = "/data/audit/llm-calls.jsonl"
if not os.path.exists(f): raise SystemExit("no audit log yet: " + f)
pin = float(os.environ["PIN"]) if os.environ["PIN"] else None
pout = float(os.environ["POUT"]) if os.environ["POUT"] else None
since = os.environ["SINCE"]
by = collections.OrderedDict()
for line in open(f):
    try: r = json.loads(line)
    except ValueError: continue
    if since and (r.get("timestamp") or "") < since: continue
    k = (r.get("stage") or "-", r.get("model_served") or r.get("model_requested") or "-")
    a = by.setdefault(k, [0, 0, 0]); a[0] += 1; a[1] += r.get("input_tokens") or 0; a[2] += r.get("output_tokens") or 0
hdr = "%-26s %-34s %6s %12s %12s" % ("stage", "model", "calls", "in_tokens", "out_tokens")
if pin is not None and pout is not None: hdr += " %9s" % "cost_usd"
print(hdr)
tot = [0, 0, 0, 0.0]
for (st, m), (c, i, o) in sorted(by.items()):
    row = "%-26s %-34s %6d %12d %12d" % (st[:26], m[:34], c, i, o)
    cost = (i * pin + o * pout) / 1e6 if pin is not None and pout is not None else None
    if cost is not None: row += " %9.4f" % cost; tot[3] += cost
    print(row); tot[0] += c; tot[1] += i; tot[2] += o
print("%-26s %-34s %6d %12d %12d" % ("TOTAL", "", tot[0], tot[1], tot[2]) + (" %9.4f" % tot[3] if pin is not None and pout is not None else ""))
'
