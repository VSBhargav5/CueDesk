# CueDesk origin and modification notes

## Starting source

- Upstream: [Blueturboguy07/cue](https://github.com/Blueturboguy07/cue).
- Fork: [VSBhargav5/CueDesk](https://github.com/VSBhargav5/CueDesk).
- Starting commit:
  [18f388712633bc37694450c55c4958fce63f8392](https://github.com/Blueturboguy07/cue/commit/18f388712633bc37694450c55c4958fce63f8392),
  Cue v0.2.5.
- Adaptation started: 27 October 2026, for the owner's Windows study/coding use.
- Existing `LICENSE` is retained unchanged. The upstream package declares
  `GPL-3.0-or-later`; original history and authorship remain part of the fork.

Cue already supports Windows. It supplies the inherited Electron application,
provider adapters, screenshot handling, audio/transcription modules, meeting
state, packaging code, and tests. Those are upstream work, not new achievements
attributable to CueDesk. The original documentation remains available at the
[pinned upstream README](https://github.com/Blueturboguy07/cue/blob/18f388712633bc37694450c55c4958fce63f8392/README.md).

## Current adaptation

The initial CueDesk work introduces a separate visible study launcher under
`desktop/` and a pure typed-request preparation contract in
`src/study-request.js`. It begins with offline, inspectable question/context
handling. The inherited meeting application is retained but is not launched by
the new default entry point.

The upstream root install hook renamed Electron to `MicrosoftEdgeUpdate.exe`
and altered Microsoft/Edge metadata and icons. CueDesk removes that behavior
and uses its own app identity with an ordinary development Electron process.
Installation avoids lifecycle scripts until Electron's official installer is
invoked explicitly.

The fork replaces inherited publishing/agent automation with read-only test CI.
It does not inherit authorization to provision accounts, publish releases,
contact external services, use credentials, or run paid provider calls.

## Retained boundaries

The source remains a derivative fork under its existing license and notices.
Keep attribution and the license with future distribution, and review the
license's source/distribution requirements before shipping a package.

The new launcher does not establish screenshot capture, live inference,
transcription, packaging reliability, performance, or user value. Future changes
should identify which upstream module is reused, what was modified, what was
tested, and what remains unverified. No screenshot invisibility or process
disguising claim is part of this first study workspace.
