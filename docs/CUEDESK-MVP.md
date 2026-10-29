# CueDesk: screen-first personal MVP

CueDesk is the active implementation sprint. SettleTrace v0.3 remains paused,
with its existing work intact. Keep one implementation sprint active; switch
back after a usable CueDesk MVP and a deliberate review.

## The job to make easier

While studying or debugging on Windows, the user wants to ask for help with the
specific material in front of them without repeatedly assembling context.
Start with an inspectable question and screenshot, then an explicit request to
the chosen model. The user can be the first real operator, but usefulness,
time savings, model quality, and monetization are not yet measured.

## Today's foundation

The new launcher provides a visible local study panel and deterministic request
preparation from typed question/context. The user selects hint, explanation,
or debugging mode, inspects the request, and may copy it. There is no model
inference in that step. Invalid or oversized input must fail rather than being
silently truncated.

This starting portion isolates a small learning surface from Cue's larger
meeting assistant. The inherited provider and capture modules remain available
for reuse after their contracts and data flow are reviewed.

## MVP completion gates

| Gate | Evidence required |
| --- | --- |
| Select context | User chooses a screen/window or supplied image; preview shows the actual selected context |
| Review before sending | The question, image, destination provider, and capture state are clear before the explicit send action |
| Ask for help | One configured provider returns a real answer with visible progress, cancellation, and useful errors |
| Clear context | User can remove the selected image, question, and current response; the next request excludes cleared context |
| Use on Windows | Source-run launch, ordinary close/quit, and the complete happy/error paths are verified on Windows |
| Explain the boundary | README and tests distinguish local preparation, screen capture, provider transmission, and model inference |

A screenshot existing in memory is not evidence that a provider received it.
A provider request succeeding is not evidence that the explanation is correct.
Provider quality needs examples the user can independently check.

## Sequence after setup

1. Inspect Cue's screen-capture code and add user-selected screenshot preview
   without automatically sending it.
2. Review one provider adapter, configure it deliberately, and connect an explicit
   send/cancel path. Use offline fixtures for automated tests; live paid calls
   need separate authorization.
3. Exercise a study example and a debugging example on the user's Windows machine.
   Record observed problems before deciding whether packaging is the next need.
4. After the screen-first MVP, review a separate opt-in audio/transcription slice.
   Meeting notes require their own capture, retention, and data-flow decisions.

Avoid adding a hosted service, subscriptions, agent loops, broad integrations,
or a new abstraction merely to fill the roadmap. Do not claim a model-assisted
workflow until a real configured model path is implemented and verified.

## Learning session: preparation is not inference (60–90 minutes)

Allow 10 minutes to predict the result, 25 minutes to inspect and experiment,
15–30 minutes for the desktop boundary, and 10–15 minutes to explain a tradeoff.

From the repository root, first predict which parts of this request change when
the mode changes:

```powershell
node -e "const {prepareStudyRequest}=require('./src/study-request'); console.log(prepareStudyRequest({question:'Why does this loop miss the last item?',context:'for (let i = 0; i < items.length - 1; i++) visit(items[i]);',mode:'hint'}).prompt)"
node --test test/study-request.test.js
```

Read `src/study-request.js`. Repeat the command with `explain` and `debug`.
Try an empty question and an unsupported mode. Predict the rejection before
running it. Inspect whether the context remains exactly the data you supplied
apart from documented outer whitespace trimming.

Then trace the desktop boundary:

- The renderer displays fields and the prepared request.
- The preload exposes only the intended bridge methods.
- The main process validates desktop requests and performs privileged operations
  such as writing the clipboard.
- The pure request-preparation module does not need Electron, files, or a network.

Use the interface to prepare a request, edit the context, and prepare it again.
Check the new preview before copying. Close the window and distinguish that action
from clearing the Windows clipboard.

Tradeoff: a small isolated study launcher is easier to inspect and learn, while
reusing Cue's existing modules later requires deliberate integration work.
Keeping preparation separate from inference permits offline verification and
clear transmission controls, but the current foundation does not answer questions.

Explain one question in your own words: **Where would information first leave
the machine in the planned MVP, and why does preparing or copying a request
not prove that a model answered it?**

This exercise is prepared for practice. Learning completion requires the user's
own run and explanation; it is not inferred from code being written.
