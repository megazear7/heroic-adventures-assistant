I want to seperate the Copilot instructions, prompts, skills, and agents from the data for the mcp server.

1. Create an `assets/knowledge` folder
1. Create the following folders:
    - `assets/knowledge/chapters`
    - `assets/knowledge/rules`
    - `assets/knowledge/skills`
1. Move `.github/skills/chapter-*/SKILL.md` files into the `assets/knowledge/chapters` folder and name the file something like `chapter-1-introduction.md` (i.e. do not keep the `SKILL.md` file name as then they will all be the same name)
1. Move `.github/skills/rules-*/SKILL.md` files into the `assets/knowledge/chapters` folder and follow the same renaming pattern
1. Move the remaining `.github/skills/*/SKILL.md` files into the `assets/knowledge/skills` folder and follow the same renaming pattern.
1. Remove the current `list_` and `get_` tools from the mcp server at `netlify/edge-functions`
1. Update the mcp server at `netlify/edge-functions` to dynamically define one list tool and one get tool for each folder under `assets/knowledge`
    1. `list_<folder-name>`
    1. `get_<folder-name>`
