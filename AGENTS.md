<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep one mounted live voice controller for conversation and menu selections; this preserves the same voice and prevents overlapping narrators.
- Keep radio playback in one mounted RadioPlayer with its own CORS-enabled analyser, isolated from voiceLevel; music drives bounded upper-body rhythm, never lips or planted legs.
- Keep named dance profiles and their pure audio-reactive motion in the shared music module; radio selection and spoken requests must drive the same bounded gestures.
- Manual genre introductions use the mounted voice controller without starting microphone capture; dance blends gently with speech and yields to listening, pointing and explicit gestures to avoid limb conflicts.
- Zoord speech/brain fallback chain is premium gateway first, then Grok (xAI, `src/lib/xai.server.ts` + `/api/zoord-voice`), then Groq, then free browser voice/local scripts; every failure must auto-degrade, never dead-end the presentation.
- Share conversational scope through zoord-conversation across live voice, delegated reasoning and question handlers; this prevents menu-only restrictions diverging between entry points.

- Attach the procedural LED mouth to the model's head bone and drive it from actual output audio amplitude; this preserves animation alignment and audio synchronization.
- Represent the procedural mouth as closed-at-rest lips and an audio-driven opening, not equalizer bars; this provides a readable mouth without altering the supplied face mesh or claiming phoneme recognition.
- Keep one user-gesture-initialized, playback-gated stream analyser for live and menu audio, attaching late streams at playback time and resetting on stops; this avoids stream-arrival races without routing or duplicating speaker audio.
- Use the shared playback meter for recordings too, with owner-scoped resets and a zero-gain destination branch for stream analysis; this prevents inactive players clearing mouth movement and ensures browsers process the analyser without duplicated speech.
- Menu details use a nonmodal side panel (lower panel on narrow screens) so the robot remains visible.
- Derive pointing axes from child-bone offsets and preserve animation twist; keep gesture targets outside the body at shoulder height to avoid face collisions.
- Reserve a separate scene viewport beside or above menu details and keep one shared panel-position function for gestures and floating cards; framing stays aligned on resize.
- Derive customer greeting gestures from incoming live transcript fragments; use a bounded procedural outward wave when the active avatar has no wave clip, preserving voice transport and avoiding looping greetings.
- Drive LED overlay morph targets only from measured playback audio (amplitude opens, spectral balance rounds or widens); never claim phoneme recognition — true visemes require real Audio2Face weights.
- Animate the supplied talking clip while measured voice output is audible and pause it in silence; gestures stay tied to real playback.
- Keep Blender preparation offline in tools/blender and preserve the supplied face, skeleton and baked necklace; this avoids destructive automatic face edits.
- Voice category-selection events open the same nonmodal menu as clicks; this keeps spoken recommendations and visible menu details aligned.
- Map the active avatar's supplied conversation clips to presentation and relaxed posture, with a model-specific head-local mouth anchor; this supports avatar replacement without changing the approved voice or source mesh.
- Filter root, hip and leg tracks from stage presentation clips; stationary service gestures must not inherit locomotion or twist the planted lower body.
- Gate browser-speech mouth cues on utterance start, pause, resume and end; this fallback cannot expose a measured audio waveform.
- Restore procedural limb layers before each frame without overwriting fresh mixer poses, and bound presentation reach by actual limb lengths; this prevents stuck arms and unnatural overextension when talking clips pause.
- Native packaging (capacitor.config.json, electron/main.cjs, native-shell/) wraps the published URL instead of a static bundle; the app depends on server functions, AI and realtime orders that cannot run offline from a file:// bundle.
- Security stays isolated under _authenticated with admin-only RLS and existing camera/event/settings tables; first account promotes managers, while the public stage reads only security_mode_active() to protect camera data and preserve stage/voice/AI.
- Store credential-free local RTSP as pending bridge metadata; browser media requires HTTPS and is live only after receipt, preventing exposed passwords and false surveillance status.
- Camera AI analysis runs from the open security panel (client interval) through an admin-checked server function; no unattended cron, so credits stop when no panel is open.
- Keep uploaded restaurant architecture in a separate normalized, optimized static backdrop with its own Suspense boundary; preserve the independent Zoord rig and voice controller when changing scenery.
