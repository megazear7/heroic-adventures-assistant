---
name: add-knowledge-entry
description: Add a new entry to an existing knowledge folder.
argument-hint: folder name and entry topic
---

I want to add a new knowledge entry. Help me:

1. Confirm which knowledge folder to add it to (chapters, rules, skills, or agents).
2. Choose an appropriate kebab-case filename.
3. Create the entry `.md` file in `assets/knowledge/<folder>/entries/`.
4. Update the `assets/knowledge/<folder>/info.md` table with the new entry.
5. Remind me to test with `npm start` and verify the entry appears in `<folder>_list` and `<folder>_get`.

Follow the conventions in the add-knowledge-content skill.
