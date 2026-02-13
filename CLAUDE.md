# CLAUDE.md

This file provides context and instructions for Claude Code when working in this repository.

## Project Overview

- **Repository**: ClaudeTRIAL
- **Type**: General-purpose / mixed-language project
- **Remote**: https://github.com/chris-walker0151/ClaudeTRIAL.git

## Build & Run Commands

<!-- Update these as the project evolves -->
- No build system configured yet. Add commands here as they are introduced.

## Code Style & Conventions

### General
- Use clear, descriptive variable and function names.
- Prefer readability over cleverness.
- Keep functions small and focused on a single responsibility.
- Add comments only where the logic isn't self-evident.

### Formatting
- Use consistent indentation (4 spaces preferred unless a language convention dictates otherwise).
- Keep line length under 100 characters where practical.
- Use blank lines to separate logical sections within files.

### Naming
- **Files**: Use kebab-case for file names (e.g., `my-module.js`, `data-parser.py`).
- **Variables/Functions**: Use camelCase (JS/TS) or snake_case (Python) as appropriate for the language.
- **Classes**: Use PascalCase.
- **Constants**: Use UPPER_SNAKE_CASE.

### Language-Specific
- **JavaScript/TypeScript**: Prefer `const` over `let`; avoid `var`. Use arrow functions for callbacks.
- **Python**: Follow PEP 8. Use type hints for function signatures.

## Architecture & Project Structure

<!-- Update this section as the project grows -->
```
ClaudeTRIAL/
├── CLAUDE.md          # This file — project context for Claude
└── ...                # Add directories and key files as they are created
```

## Workflow Preferences

- **Commits**: Write concise commit messages that explain *why*, not just *what*.
- **Branches**: Use feature branches (`feature/description`) for new work; `fix/description` for bug fixes.
- **PRs**: Keep pull requests focused and small. Include a summary and test plan.
- **Testing**: Write tests alongside new features. Run tests before committing.
- **Dependencies**: Pin dependency versions. Document why each dependency is needed.

## Important Notes

- Do not commit secrets, API keys, or credentials. Use environment variables or `.env` files (which should be in `.gitignore`).
- Prefer editing existing files over creating new ones unless new files are clearly needed.
- Keep solutions simple — avoid over-engineering.
