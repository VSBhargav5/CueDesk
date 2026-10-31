# CueDesk

A personal Windows study and coding workspace, adapted from
[Blueturboguy07/cue](https://github.com/Blueturboguy07/cue).

The screen-study launcher lists screens and windows when requested, captures the
selected source as a still image, shows its preview, and sends that image and a
reviewed study question to OpenAI only after explicit confirmation. It displays
the answer and supports cancellation and an optional always-on-top window.
The initial connected workflow has been tested using synthetic captures and a
mock provider. Live capture/provider behavior and model quality remain unverified.
The inherited Cue meeting assistant remains separate in `main.js`.

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

Once dependencies and Electron are installed, double-click `Launch-CueDesk.cmd`
in this folder to open the same study workspace without typing a command.

## What to try

1. Click **List screens and windows**, choose the material you want to study,
   then click **Capture preview**. Confirm the image is the one you intend.
2. Enter a question and optional code, choose hint/explain/debug, then preview it.
3. Enter your own OpenAI API key into the masked session field, review the text
   and screenshot, check the review box and click **Ask about this screen**.
4. Read and check the answer. Use **Cancel request** to stop waiting or
   **Remove image** / **Clear session** to discard the capture.
5. Optionally check **Keep CueDesk above other windows** while studying.

OpenAI's Responses API receives the exact preview image and prepared text with
`store=false` when you choose Ask. Calls may incur charges; `store=false` does
not guarantee zero retention. Cancel aborts the local request and cannot guarantee
the provider stopped processing or billing it. The key and capture remain in
memory for the session; Clear removes them from the interface, not securely erased.
The image is a compressed JPEG and can lose small details. Listing sources asks
Electron for names; obtaining a selected source may create temporary thumbnails
of other screens/windows of the same type inside the process. Only the selected
preview is retained and sent. No microphone/audio capture in the study launcher.
Clipboard history and any provider data retention are outside CueDesk's control.

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
The Electron smoke uses a synthetic image, fake provider and stub clipboard;
it exercises capture preview, exact image payload, answer and cancellation.

Read-only CI is configured
for Windows and Linux on Node 22 and 24; consult the actual workflow result for
verification; the Windows/Node 24 job also runs the Electron smoke. An inherited
test passing does not establish a new CueDesk feature,
and a unit test does not establish real provider quality or Windows packaging.

## Next session

Run a user-authorized synthetic live-provider trial and manually verify screen
selection, pinning and cancellation on Windows. Then improve the workflow based
on observed use. Meeting transcription and notes follow separately, with explicit
capture controls. The inherited Cue overlay is not yet integrated or verified.

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
