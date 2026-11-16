# Valkyrja Themes

One Firefox add-on that turns every website into the Valkyrja Night palette. See `README.md` for the layout, the build and the check scripts.

- Every colour comes from `src/palette.ts`. Site modules in `src/sites/` set fonts and shapes only, never a colour.
- `engine/` is a copy of Dark Reader's engine. Mark each change to it with `Valkyrja change:` and list the file in `THIRD-PARTY.md`.
- Visual work is checked on a real render (`tools/`), not only by tests.
- This repo is public: no personal details, local paths, machine names or session links in files, commits or issues.

## Agent skills

### Issue tracker

GitHub issues on this repo (HrafnaValkyrja/valkyrja-themes), through the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
