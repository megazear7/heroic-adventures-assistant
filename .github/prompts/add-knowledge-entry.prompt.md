---
name: add-knowledge-entry
description: Add a new entry to an existing content type.
argument-hint: content type and entry topic
---

I want to add a new knowledge entry. Help me:

1. Confirm which content type to add it to (chapter, rule, skill, or agent).
2. Choose an appropriate kebab-case folder name.
3. Create the entry folder in `assets/content/entries/<type>/<entry-name>/`.
4. Create `data.json` with entry metadata (contentType, title, description, slug).
5. Create `tools/content.md` with the entry's markdown content.
6. Remind me to test with `npm start` and verify the entry appears in `list_<type>` and `get_<type>_content`.

Follow the conventions in the add-knowledge-content skill.
