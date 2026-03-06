from pathlib import Path
import json, re

base = Path('assets/content/entries')

# Check spell types/tiers to map to subcategories
spell_dir = base / 'spell'
tiers = set()
for e in sorted(spell_dir.iterdir()):
    if not e.is_dir(): continue
    content = (e / 'tools' / 'content.md').read_text()
    m = re.search(r'\*\*Type:\*\*\s*(.+)', content)
    if m:
        tiers.add(m.group(1).strip())

print("SPELL TIERS:", sorted(tiers))

# Check a few content.md files for title extraction patterns
for typ in ['armor', 'background', 'chapter', 'class', 'race', 'weapon', 'shield', 'agent', 'skill', 'expertise', 'feat', 'flaw', 'rule']:
    tp = base / typ
    entries = sorted([d for d in tp.iterdir() if d.is_dir()])[:2]
    for e in entries:
        d = json.loads((e / 'data.json').read_text())
        content = (e / 'tools' / 'content.md').read_text()
        h1 = re.search(r'^#\s+(.+)$', content, flags=re.M)
        title_from_h1 = h1.group(1).strip() if h1 else '??'
        print(f"{typ}/{e.name}: data.title={d.get('title')!r}, data.desc={d.get('description','')[:60]!r}, h1={title_from_h1!r}")
