---
name: add-knowledge-content
description: How to add new content to the assets/knowledge folder structure.
---

# Add Knowledge Content

## Purpose

Guide developers through adding new knowledge entries or entire knowledge folders to the Heroic Adventures MCP server.

## Knowledge Folder Structure

```
assets/knowledge/
├── <folder-name>/
│   ├── info.md          # Overview and entry table
│   └── entries/
│       ├── entry-one.md
│       ├── entry-two.md
│       └── ...
```

Each folder under `assets/knowledge/` automatically gets three MCP tools:
- `<folder-name>_info` — serves `info.md`
- `<folder-name>_list` — parses entry names from `info.md` table
- `<folder-name>_get` — serves a specific `entries/<name>.md` file

## Adding an Entry to an Existing Folder

1. Create a new `.md` file in `assets/knowledge/<folder>/entries/`.
   - Use kebab-case naming (e.g., `my-new-entry.md`).
   - Do NOT use `SKILL.md`, `.agent.md`, or `.prompt.md` extensions.
2. Update `assets/knowledge/<folder>/info.md` to add a row to the markdown table:
   ```
   | my-new-entry | Brief description of the entry |
   ```
3. Test with `npm start` and verify with `<folder>_list` and `<folder>_get`.

## Adding a New Knowledge Folder

1. Create the folder: `assets/knowledge/<new-folder>/`
2. Create `assets/knowledge/<new-folder>/info.md` with this template:

   ```markdown
   # Folder Title

   Description of what this folder contains.

   ## Usage

   - Use `<new-folder>_list` to see all available entries.
   - Use `<new-folder>_get` with an `entry-name` to retrieve a specific entry.

   ## Available Entries

   | Entry Name | Description |
   |---|---|
   | example-entry | Description of the entry |
   ```

3. Create `assets/knowledge/<new-folder>/entries/` and add `.md` files.
4. Add the folder name to `knowledge_folders` in `static/file-index.json`.
5. Run `npm test` to verify.

## Naming Conventions

- Folder names: lowercase kebab-case (e.g., `chapters`, `rules`, `skills`)
- Entry files: lowercase kebab-case with `.md` extension (e.g., `chapter-01-introduction.md`)
- Never use `SKILL.md`, `.agent.md`, or `.prompt.agent.md` as file names
- The `info.md` file is required in every knowledge folder

## Important Notes

- The `<folder>_list` tool parses entry names from the markdown table in `info.md`. Ensure entries follow the `| entry-name | description |` format.
- Entry names in the table must match the filename (without `.md` extension).
- All content is served statically — no database or dynamic content generation.
