---
name: commit-changes
description: Review staged changes and commit with a clear message.
argument-hint: brief description of what changed (optional)
---

Help me commit my current changes:

1. Run `git status` and `git diff --stat` to see what's changed.
2. Review the changes for anything that should NOT be committed (credentials, temp files, large binaries, debug code, .env files).
3. If you see anything problematic, warn me before proceeding.
4. Auto-add all appropriate changes with `git add`.
5. Suggest a clear, conventional commit message based on the actual changes.
6. Ask me to confirm before running `git commit`.
