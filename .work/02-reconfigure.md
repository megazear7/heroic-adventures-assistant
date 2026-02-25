I want to seperate the Copilot instructions, prompts, skills, and agents from the data for the mcp server.

## Steps

1. Create an `assets/knowledge` folder
1. Create the following folders:
    - `assets/knowledge/chapters`
    - `assets/knowledge/rules`
    - `assets/knowledge/skills`
    - `assets/knowledge/agents`
1. Add a `entries` sub folder to each of the created folders.
1. Move `.github/skills/chapter-*/SKILL.md` files into the `assets/knowledge/chapters/entries` folder and name the file something like `chapter-1-introduction.md` (i.e. do not keep the `SKILL.md` file name as then they will all be the same name)
1. Move `.github/skills/rules-*/SKILL.md` files into the `assets/knowledge/chapters/entries` folder and follow the same renaming pattern
1. Move the remaining `.github/skills/*/SKILL.md` files into the `assets/knowledge/skills/entries` folder and follow the same renaming pattern.
1. Move the agents under `.github/agents/` to the `assets/knowledge/agents/entries` folder
1. Move the files under `.github/prompts` to `assets/knowledge/skills/entries` and follow the same renaming pattern. 
1. Remove the current `list_` and `get_` tools from the mcp server at `netlify/edge-functions`
1. Update the mcp server at `netlify/edge-functions` to dynamically define one info tool, one list tool, and one get tool for each folder under `assets/knowledge`
    1. `<folder-name>_info`: Return the file contents of `assets/knowledge/<folder-name>/info.md`
    1. `<folder-name>_list`: Return the list of files under `assets/knowledge/<folder-name>/entries/`
    1. `<folder-name>_get`: Return the file contents of `assets/knowledge/<folder-name>/entries/<entry-name>.md` (requires `entry-name` to be provided in the tool call)
1. Add `.github/skills` for things like how to update the mcp server, how to test, how to run, how to add more content to the  `assets/knowledge` folder, how the sub folders are broken into seperate tools, etc.
1. Update the `.github/prompts` to have prompts for onboarding as a developer to this project, commiting changes (auto add, ask if you see any code that should not be committed) etc.
1. Update the `.github/copilot-instructions.md` to remove references to the rules and to instead focus on developer tasks for this project.
1. Remove the `.github/agents` folder
1. Refactor the readme to focus on developer stuff, not the rulebook.

## Notes

 - The files under `assets/knowledge` should NOT be called `SKILL.md`, should NOT have `.agent.md` extensions, should NOT have `.prompt.agent.md` extensions.
 - The `.github/skills/create-skill` skill should NOT be moved to `assets/knowledge` with the other skills.
 - The `.github/skills/onboarding` skill should NOT be moved to `assets/knowledge` with the other skills.
