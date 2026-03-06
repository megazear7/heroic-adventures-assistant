import json
from collections import defaultdict

m = json.load(open('scripts/manifest.json'))
print(f'Total: {len(m)}')
cats = {}
for e in m:
    cats[e['category']] = cats.get(e['category'], 0) + 1
for c in sorted(cats):
    print(f'  {c}: {cats[c]}')
print()

groups = defaultdict(list)
for e in m:
    groups[e['dir']].append(e)
for d in sorted(groups):
    for e in groups[d][:3]:
        print(f"  {e['dir']}/{e['slug']}: title={repr(e['title'])} cat={repr(e['category'])}")
    print()
