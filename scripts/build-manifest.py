"""
Build a JSON manifest of all entries to create in Contentful.
"""
from pathlib import Path
import json, re

base = Path('assets/content/entries')

# --- Build spell → school mapping from chapter ---
chapter = Path('assets/content/entries/chapter/chapter-05-spells/tools/content.md').read_text()

# Split chapter by school headings
school_sections = re.split(r'^#\s+.*?(Mystic|Rune|Nature|Divine)\s+[Ss]pells', chapter, flags=re.M)
# school_sections[0] is before first school, then alternating: school_name, section_text, ...

school_map = {
    'Mystic': 'spell > arcane',
    'Rune': 'spell > rune',
    'Nature': 'spell > nature',
    'Divine': 'spell > divine',
}

spell_to_school = {}
for i in range(1, len(school_sections), 2):
    school_name = school_sections[i]
    section_text = school_sections[i + 1] if i + 1 < len(school_sections) else ''
    category = school_map.get(school_name, 'spell > arcane')
    # Find all ## headings in this section
    for m in re.finditer(r'^##\s+(.+?)(?:\s*\(\*.*?\*\))?\s*$', section_text, flags=re.M):
        spell_name = m.group(1).strip()
        slug = 'spell-' + re.sub(r'[^a-z0-9]+', '-', spell_name.lower()).strip('-')
        spell_to_school[slug] = category

# --- Directory → category mapping ---
dir_to_category = {
    'agent': 'agent',
    'armor': 'item > armor',
    'background': 'background',
    'chapter': 'chapter',
    'class': 'class',
    'expertise': 'expertise',
    'feat': 'feat',
    'flaw': 'flaw',
    'race': 'race',
    'rule': 'rule',
    'shield': 'item > shield',
    'skill': 'skill',
    'spell': None,  # determined per-spell
    'weapon': 'item > weapon',
}

manifest = []

for tp in sorted([d for d in base.iterdir() if d.is_dir()]):
    type_name = tp.name
    base_category = dir_to_category.get(type_name)
    
    for e in sorted([d for d in tp.iterdir() if d.is_dir()]):
        data = json.loads((e / 'data.json').read_text())
        content_file = e / 'tools' / 'content.md'
        content = content_file.read_text()
        
        # Extract title from h1 in content.md
        h1 = re.search(r'^#\s+(.+)$', content, flags=re.M)
        if h1:
            title = h1.group(1).strip()
            # Strip any HTML tags (e.g. <img .../>) from h1
            title = re.sub(r'<[^>]+>', '', title).strip()
        else:
            # No h1 found — derive title from slug
            slug = data.get('slug', e.name)
            # Remove type prefix (e.g. "spell-" from "spell-fireball")
            for prefix in [type_name + '-']:
                if slug.startswith(prefix):
                    slug = slug[len(prefix):]
            title = slug.replace('-', ' ').title()

        # Clean up title based on type
        if type_name == 'agent':
            title = re.sub(r'\s+Agent\s*$', '', title).strip()
        elif type_name == 'rule':
            title = re.sub(r'^Rule:\s*', '', title).strip()
        
        # Determine category
        if type_name == 'spell':
            category = spell_to_school.get(e.name, 'spell > arcane')
        else:
            category = base_category
        
        manifest.append({
            'dir': type_name,
            'slug': e.name,
            'title': title,
            'category': category,
            'content_path': str(content_file),
        })

# --- Deduplicate titles (Contentful requires unique titles) ---
from collections import Counter
title_counts = Counter(m['title'] for m in manifest)
dup_titles = {t for t, c in title_counts.items() if c > 1}

for entry in manifest:
    if entry['title'] in dup_titles:
        print(f"DEDUP: {entry['slug']} title={entry['title']} dir={entry['dir']} cat={entry['category']}")
        # For expertise, extract the skill-group from the slug (e.g. "agility" from expertise-agility-climbing)
        if entry['dir'] == 'expertise':
            parts = entry['slug'].split('-')
            if len(parts) >= 3:
                skill_group = parts[1].title()  # e.g. "Agility", "Strength"
                entry['title'] = f"{entry['title']} ({skill_group})"
            else:
                entry['title'] = f"{entry['title']} ({entry['category'].title()})"
        else:
            # Use category as disambiguator
            cat_label = entry['category'].split(' > ')[-1].title() if ' > ' in entry['category'] else entry['category'].title()
            entry['title'] = f"{entry['title']} ({cat_label})"

# Print summary
print(f"Total entries: {len(manifest)}")
for cat in sorted(set(m['category'] for m in manifest)):
    count = sum(1 for m in manifest if m['category'] == cat)
    print(f"  {cat}: {count}")

print("\n--- FULL MANIFEST ---")
for m in manifest:
    print(json.dumps(m))

# Also write to file for reference
with open('scripts/manifest.json', 'w') as f:
    json.dump(manifest, f, indent=2)
print(f"\nManifest written to scripts/manifest.json")
