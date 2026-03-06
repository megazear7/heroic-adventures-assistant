"""
Convert markdown content.md files to Contentful Rich Text JSON format.
Generates payload files for each entry in the manifest.
"""
import json
import re
from pathlib import Path


def parse_inline(text):
    """Parse inline markdown (bold, italic, links) to Contentful text nodes."""
    nodes = []
    # Handle: **bold**, *italic*, [text](url), `code`
    pattern = r'(\*\*.*?\*\*|\*[^*]+?\*|`[^`]+?`|\[.*?\]\(.*?\))'
    parts = re.split(pattern, text)
    for part in parts:
        if not part:
            continue
        m_bold = re.match(r'^\*\*(.+?)\*\*$', part, re.DOTALL)
        m_italic = re.match(r'^\*(.+?)\*$', part, re.DOTALL)
        m_code = re.match(r'^`(.+?)`$', part)
        m_link = re.match(r'^\[(.+?)\]\((.+?)\)$', part)
        if m_bold:
            nodes.append({"nodeType": "text", "value": m_bold.group(1), "marks": [{"type": "bold"}], "data": {}})
        elif m_italic:
            nodes.append({"nodeType": "text", "value": m_italic.group(1), "marks": [{"type": "italic"}], "data": {}})
        elif m_code:
            nodes.append({"nodeType": "text", "value": m_code.group(1), "marks": [{"type": "code"}], "data": {}})
        elif m_link:
            nodes.append({
                "nodeType": "hyperlink",
                "data": {"uri": m_link.group(2)},
                "content": [{"nodeType": "text", "value": m_link.group(1), "marks": [], "data": {}}]
            })
        else:
            nodes.append({"nodeType": "text", "value": part, "marks": [], "data": {}})
    return nodes if nodes else [{"nodeType": "text", "value": "", "marks": [], "data": {}}]


def text_node(value, marks=None):
    return {"nodeType": "text", "value": value, "marks": marks or [], "data": {}}


def paragraph_node(inline_nodes):
    return {"nodeType": "paragraph", "data": {}, "content": inline_nodes}


def heading_node(level, inline_nodes):
    return {"nodeType": f"heading-{level}", "data": {}, "content": inline_nodes}


def markdown_to_richtext(md_text):
    """Convert a markdown string to Contentful Rich Text document JSON."""
    # Strip HTML tags (img, etc.)
    md_text = re.sub(r'<img[^>]*/?>', '', md_text)
    md_text = re.sub(r'</?[a-zA-Z][^>]*>', '', md_text)

    lines = md_text.split('\n')
    content = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Heading
        m = re.match(r'^(#{1,6})\s+(.+)$', line)
        if m:
            level = len(m.group(1))
            text = m.group(2).strip()
            content.append(heading_node(level, parse_inline(text)))
            i += 1
            continue

        # HR
        if re.match(r'^[\-\*\_]{3,}\s*$', line.strip()):
            content.append({"nodeType": "hr", "data": {}, "content": []})
            i += 1
            continue

        # Blockquote
        if line.startswith('> '):
            quote_lines = []
            while i < len(lines) and lines[i].startswith('> '):
                quote_lines.append(lines[i][2:])
                i += 1
            text = ' '.join(quote_lines)
            content.append({
                "nodeType": "blockquote",
                "data": {},
                "content": [paragraph_node(parse_inline(text))]
            })
            continue

        # Table
        if '|' in line and i + 1 < len(lines) and re.match(r'^[\|\-\s:]+$', lines[i + 1].strip()):
            rows = []
            # Header row
            headers = [c.strip() for c in line.strip().strip('|').split('|')]
            rows.append(('header', headers))
            i += 2  # skip header and separator
            while i < len(lines) and '|' in lines[i] and lines[i].strip():
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                rows.append(('cell', cells))
                i += 1
            # Build table node
            table_rows = []
            for row_type, cells in rows:
                cell_type = "table-header-cell" if row_type == 'header' else "table-cell"
                row_cells = []
                for cell_text in cells:
                    row_cells.append({
                        "nodeType": cell_type,
                        "data": {},
                        "content": [paragraph_node(parse_inline(cell_text))]
                    })
                table_rows.append({
                    "nodeType": "table-row",
                    "data": {},
                    "content": row_cells
                })
            content.append({"nodeType": "table", "data": {}, "content": table_rows})
            continue

        # Unordered list (- or *)
        if re.match(r'^[\-\*]\s+', line):
            items = []
            while i < len(lines) and re.match(r'^[\-\*]\s+', lines[i]):
                text = re.sub(r'^[\-\*]\s+', '', lines[i])
                items.append(text)
                i += 1
            content.append({
                "nodeType": "unordered-list",
                "data": {},
                "content": [
                    {
                        "nodeType": "list-item",
                        "data": {},
                        "content": [paragraph_node(parse_inline(item))]
                    } for item in items
                ]
            })
            continue

        # Ordered list
        if re.match(r'^\d+\.\s+', line):
            items = []
            while i < len(lines) and re.match(r'^\d+\.\s+', lines[i]):
                text = re.sub(r'^\d+\.\s+', '', lines[i])
                items.append(text)
                i += 1
            content.append({
                "nodeType": "ordered-list",
                "data": {},
                "content": [
                    {
                        "nodeType": "list-item",
                        "data": {},
                        "content": [paragraph_node(parse_inline(item))]
                    } for item in items
                ]
            })
            continue

        # Empty line
        if not line.strip():
            i += 1
            continue

        # Paragraph (collect consecutive non-special lines)
        para_lines = []
        while i < len(lines):
            l = lines[i]
            if not l.strip():
                break
            if re.match(r'^#{1,6}\s+', l):
                break
            if re.match(r'^[\-\*]\s+', l):
                break
            if re.match(r'^\d+\.\s+', l):
                break
            if re.match(r'^[\-\*\_]{3,}\s*$', l.strip()):
                break
            if l.startswith('> '):
                break
            if '|' in l and i + 1 < len(lines) and re.match(r'^[\|\-\s:]+$', lines[i + 1].strip()):
                break
            para_lines.append(l)
            i += 1

        text = ' '.join(para_lines)
        if text.strip():
            content.append(paragraph_node(parse_inline(text)))
        if not para_lines:
            # Safety: skip unrecognized lines to prevent infinite loop
            i += 1

    # Ensure non-empty document
    if not content:
        content = [paragraph_node([text_node("")])]

    return {
        "nodeType": "document",
        "data": {},
        "content": content
    }


def main():
    manifest = json.load(open('scripts/manifest.json'))
    payloads_dir = Path('scripts/payloads')
    payloads_dir.mkdir(exist_ok=True)

    for idx, entry in enumerate(manifest):
        md_content = Path(entry['content_path']).read_text()
        richtext = markdown_to_richtext(md_content)

        payload = {
            "spaceId": "1xrzrik78qmb",
            "environmentId": "master",
            "contentTypeId": "ruleReference",
            "fields": {
                "title": {"en-US": entry['title']},
                "category": {"en-US": entry['category']},
                "content": {"en-US": richtext}
            }
        }

        out_file = payloads_dir / f"{entry['slug']}.json"
        out_file.write_text(json.dumps(payload, indent=2))
        if (idx + 1) % 50 == 0:
            print(f"  Generated {idx + 1}/{len(manifest)}...")

    print(f"Generated {len(manifest)} payload files in {payloads_dir}/")


if __name__ == '__main__':
    main()
