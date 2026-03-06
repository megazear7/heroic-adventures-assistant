from pathlib import Path
import re

# Read the spells chapter to understand how spells are categorized by school
chapter = Path('assets/content/entries/chapter/chapter-05-spells/tools/content.md').read_text()

# Find school headings (e.g., "# Arcane Spells" or "## Arcane" etc.)
headings = re.findall(r'^(#{1,3})\s+(.+)$', chapter, flags=re.M)
for level, text in headings:
    print(f"{level} {text}")
