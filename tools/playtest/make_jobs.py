#!/usr/bin/env python3
"""Job lists for tools/playtest/campaign.js.
  python3 make_jobs.py matrix 5      -> jobs_m0..4.json: 10 champions x 5 arenas x champion lv 1/10/20/30 x 2
  python3 make_jobs.py progression   -> jobs_p_<champ>.json: empty save, 40 runs always on the first uncleared arena
Run shards in parallel: node campaign.js jobs_m0.json out_m0.jsonl 8763 & ..."""
import json, sys
CHAMPS = ["tanque","guerrero","mago","soporte","segador","axiom","profeta","musashi","cazadora","nigromante"]
ARENAS = ["bosque","acuatica","hielo","laberinto","infernal"]
mode = sys.argv[1] if len(sys.argv) > 1 else 'matrix'
if mode == 'matrix':
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    jobs = [{"tag": f"M{lv}", "cls": c, "arena": a, "lvl": lv} for lv in [1, 10, 20, 30] for c in CHAMPS for a in ARENAS for _ in range(2)]
    for i in range(n): json.dump(jobs[i::n], open(f'jobs_m{i}.json', 'w'))
else:
    for s in ["tanque", "mago", "cazadora"]:
        seq = [{"tag": f"P-{s}", "cls": s, "arena": "auto", "lvl": 0, "gear": True, "empty": True}]
        seq += [{"tag": f"P-{s}", "cls": s, "arena": "auto", "lvl": 0, "gear": True, "keep": True} for _ in range(39)]
        json.dump(seq, open(f'jobs_p_{s}.json', 'w'))
