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
- Attach the procedural LED mouth to the model's head bone and drive it from actual output audio amplitude; this preserves animation alignment and audio synchronization.
- Represent the procedural mouth as closed-at-rest lips and an audio-driven opening, not equalizer bars; this provides a readable mouth without altering the supplied face mesh or claiming phoneme recognition.
- Keep one user-gesture-initialized, playback-gated stream analyser for live and menu audio, attaching late streams at playback time and resetting on stops; this avoids stream-arrival races without routing or duplicating speaker audio.
- Menu details use a nonmodal side panel (lower panel on narrow screens) so the robot remains visible.
- Derive pointing axes from child-bone offsets and preserve animation twist; keep gesture targets outside the body at shoulder height to avoid face collisions.
- Reserve a separate scene viewport beside or above menu details and keep one shared panel-position function for gestures and floating cards; framing stays aligned on resize.
- Derive customer greeting gestures from incoming live transcript fragments and finish wave clips through mixer events; this avoids narrator-triggered waves and looping greetings without changing voice transport.
