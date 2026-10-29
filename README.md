# CueDesk

A personal Windows study and coding workspace, adapted from
[Blueturboguy07/cue](https://github.com/Blueturboguy07/cue).

**Current stage: a small offline foundation, not the AI MVP.** The new study
launcher accepts a typed question and context, prepares a tutoring request in
hint, explanation, or debugging mode, and lets you preview or copy it. The
prepared text is a request you can inspect; it is not an AI-generated answer.

Screenshots, provider calls, microphone input, system audio, and meeting notes
are not connected to this study launcher yet. Cue's existing implementation is
retained for reviewed reuse; those inherited capabilities are not claimed as
new CueDesk work or as verified behavior in this launcher.

## Run from source

Use Node.js 22.12 or newer. Check `node --version` before installation.
The system Node installation may be older than the project requires.

```powershell
npm ci --ignore-scripts
node node_modules/electron/install.js
npm start
```

The first command installs locked dependencies without running their lifecycle
scripts. The second explicitly prepares Electron's official runtime. The
upstream executable-renaming hook is removed: development uses Electron's
ordinary process identity, and the app identifies itself as CueDesk.

`npm start` launches `desktop/main.cjs`, the new visible study workspace.
It does not launch the inherited `main.js` meeting assistant. This is a source
run; no signed Windows installer is claimed.

## What to try

1. Enter a study question and paste a small, non-sensitive code or text example.
2. Choose hints, a first-principles explanation, or debugging help.
3. Preview the prepared request and inspect exactly what it contains.
4. Copy it only when you want it placed on the Windows clipboard.
5. Close the ordinary app window when finished.

The study flow has no configured model provider and does not send the prepared
request to one. Typed content is not deliberately saved as conversation history.
Copying writes the prepared text to the system clipboard, which is outside the
app's in-memory session. It is not a secure storage mechanism.

## Project map

| Path | Role |
| --- | --- |
| `desktop/main.cjs` | CueDesk window and narrow desktop operations |
| `desktop/preload.cjs` | Explicit renderer-to-main bridge |
| `desktop/renderer/` | Local study interface |
| `src/study-request.js` | Deterministic, validated request preparation |
| `test/study-request.test.js` | Offline request-contract regressions |
| `main.js`, `preload.js`, `renderer/`, other `src/` modules | Inherited Cue implementation, retained for reviewed reuse |
| `docs/CUEDESK-MVP.md` | Scope, completion gates, and the next learning session |
| `docs/CUEDESK-ORIGIN.md` | Upstream provenance and adaptation boundaries |

Run the request contract alone without Electron:

```powershell
node --test test/study-request.test.js
```

Run the complete repository suite with `npm test`. With Electron prepared,
`npm run test:desktop` exercises the real study renderer/preload/IPC with synthetic
text, stubs the clipboard, and writes `out/study-desktop.png`. This does not
verify physical clipboard integration or an interactive foreground-window launch.
Local verification: all 301 Node tests passed, and this Electron smoke passed.

Read-only CI is configured
for Windows and Linux on Node 22 and 24; consult the actual workflow result for
verification; the Windows/Node 24 job also runs the Electron smoke. An inherited
test passing does not establish a new CueDesk feature,
and a unit test does not establish real provider quality or Windows packaging.

## Next session

Add an explicit screenshot selection and preview flow, then a user-selected
provider with a clear send action, cancellation, errors, and context clearing.
The first MVP is screen-based study/coding help. Meeting transcription and notes
follow separately, with explicit capture controls.

SettleTrace is paused while this MVP is the active implementation sprint.
After the MVP is usable, review which project should lead the next sprint.
See [the MVP plan and learning exercise](docs/CUEDESK-MVP.md).

## Upstream and license

This repository is a fork, not an original Windows port. Cue already supports
Windows. The starting point is
[`18f3887`](https://github.com/Blueturboguy07/cue/commit/18f388712633bc37694450c55c4958fce63f8392)
(Cue v0.2.5). Original authorship and history are preserved.

The existing [GPL license](LICENSE) is retained; upstream's package declares
`GPL-3.0-or-later`. Read [origin and modification notes](docs/CUEDESK-ORIGIN.md)
for the distinction between inherited code, current changes, and planned work.
