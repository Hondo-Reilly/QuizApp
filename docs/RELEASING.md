# Releasing QuizApp

Follow the release checklist in [AGENTS.md](AGENTS.md#release-checklist). It is the canonical checklist for both agents and maintainers.

The v0.2.0 incident came from a desktop build using `/assets/` URLs. Electron loads its HTML with `file://`, so those URLs could not load the UI. The build and package checks now reject that pattern. A packaged-app launch check is still valuable because path checks do not catch every possible renderer startup error.
