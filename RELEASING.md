# Releasing QuizApp

1. Bump `package.json` and `package-lock.json` to the new version. Keep the web and Mac builds on the same commit.
2. Run `npm test`, `npm run lint`, `npm run build:web`, and `npm run build:mac`. The Mac build must pass both asset checks: one on `dist/` and one inside the packaged `app.asar`.
3. Push the commit and wait for **Verify builds** to pass on GitHub. Its Mac job packages the same Apple Silicon target used for the release.
4. Open the newly built app from `release/mac-arm64/QuizApp.app` or the DMG on a Mac and confirm the Library renders. Use a copy of user data when checking migrations or older records.
5. Tag that verified commit, then publish a GitHub release with `release/QuizApp-VERSION-arm64.dmg`. Verify the uploaded asset name, version, size, and checksum. Include any required manual installation steps in the release notes.

The v0.2.0 incident came from a desktop build using `/assets/` URLs. Electron loads its HTML with `file://`, so those URLs could not load the UI. The build and package checks now reject that pattern. A packaged-app launch check is still valuable because path checks do not catch every possible renderer startup error.
