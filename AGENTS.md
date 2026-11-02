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

- Keep one mounted voice controller with owner-scoped aborts; ignore retired recognition callbacks to prevent overlapping narrators. Send camera snapshots only with spoken turns, not AI timers.
- Keep radio playback in one mounted RadioPlayer with its own CORS-enabled analyser, isolated from voiceLevel; music drives bounded upper-body rhythm, never lips or planted legs.
- Share named, pure audio-reactive dance profiles in the music module so radio and spoken requests drive identical bounded gestures.
- Manual genre introductions use the mounted voice controller without starting microphone capture; dance blends gently with speech and yields to listening, pointing and explicit gestures to avoid limb conflicts.
- All paid AI uses own-account OPENAI_API_KEY server-side via direct OpenAI; legacy live gateway is disabled, errors allow local text but never switch voice/provider or bill Lovable AI.
- Share conversational and gastronomic policy through zoord-conversation across live voice, delegated reasoning and question handlers; gate menu price context and local quotations with requestsMenuPrice so presentations do not volunteer financial values.

- Render the mouth as a root sibling copying the head world matrix and measured head-local lip anchor; this avoids portal/double-scale placement errors while actual output amplitude drives the opening.
- Represent the procedural mouth as closed-at-rest lips and an audio-driven opening, not equalizer bars; this provides a readable mouth without altering the supplied face mesh or claiming phoneme recognition.
- Keep one user-gesture-initialized, playback-gated stream analyser for live and menu audio, attaching late streams at playback time and resetting on stops; this avoids stream-arrival races without routing or duplicating speaker audio.
- Use the shared playback meter for recordings too, with owner-scoped resets and a zero-gain destination branch for stream analysis; this prevents inactive players clearing mouth movement and ensures browsers process the analyser without duplicated speech.
- Menu details use a nonmodal side panel (lower panel on narrow screens) so the robot remains visible.
- Derive pointing axes from child-bone offsets and preserve animation twist; keep gesture targets outside the body at shoulder height to avoid face collisions.
- Reserve a separate scene viewport beside or above menu details and keep one shared panel-position function for gestures and floating cards; framing stays aligned on resize.
- Derive customer greeting gestures from incoming live transcript fragments; use a bounded procedural outward wave when the active avatar has no wave clip, preserving voice transport and avoiding looping greetings.
- Drive LED overlay morph targets only from measured playback audio (amplitude opens, spectral balance rounds or widens); never claim phoneme recognition — true visemes require real Audio2Face weights.
- Animate the supplied talking clip while measured voice output is audible and pause it in silence; gestures stay tied to real playback.
- Prepare Blender offline in tools/blender; preserve face, skeleton and baked necklace to avoid destructive edits.
- Voice category-selection events open the same nonmodal menu as clicks; this keeps spoken recommendations and visible menu details aligned.
- Map the active avatar's supplied conversation clips to presentation and relaxed posture, with model-specific height, head-local mouth anchor and attire bone-unit conversion; this supports avatar replacement without changing the approved voice or source mesh.
- Clone avatar materials with restrained albedo-derived emissive fill and reduced environment response; read the mixed key/rim/ambient rig from stage CSS tokens so lighting changes preserve source colors.
- Filter root, hip and leg tracks from stage presentation clips; stationary service gestures must not inherit locomotion or twist the planted lower body.
- Gate browser-speech mouth cues on utterance start, pause, resume and end; this fallback cannot expose a measured audio waveform.
- Restore procedural limb layers before each frame without overwriting fresh mixer poses, and bound presentation reach by actual limb lengths; this prevents stuck arms and unnatural overextension when talking clips pause.
- Share host timing, bounded breathing, damped dance energy and reduced-motion rules in zoord-motion; cache rig bones and crossfade only changed actions to avoid greeting restarts and pose snaps. DEV exposes __zoordScene and data-scene-ready for visual verification.
- Give procedural posture sole ownership of head/neck/spine tracks and run world-space damped gaze after all gesture layers; this prevents speech clips from lowering the face or snapping the torso.
- Use StagePresence for HUD open/close animations and stage-glass CSS tokens for surfaces; only visual wrappers unmount, leaving the voice and radio controllers mounted to prevent audio interruptions.
- Native packaging (capacitor.config.json, electron/main.cjs, native-shell/) wraps the published URL instead of a static bundle; the app depends on server functions, AI and realtime orders that cannot run offline from a file:// bundle.
- Security stays isolated under _authenticated with admin-only RLS and existing camera/event/settings tables; first account promotes managers, while the public stage reads only security_mode_active() to protect camera data and preserve stage/voice/AI.
- Store credential-free local RTSP as pending bridge metadata; browser media requires HTTPS and is live only after receipt, preventing exposed passwords and false surveillance status.
- Camera AI analysis runs from the open security panel (client interval) through an admin-checked server function; no unattended cron, so credits stop when no panel is open.
- Scenery uses Suspense, 4K preload and baked floor samples; re-bake on changes, instance LEDs, align feet, honor reduced motion.
- One account provider owns identity; private profiles never hold roles or auto-start music.

- TI projects/tasks use admin-only tables and authenticated functions; browser storage never authorizes access.
