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
- Keep one user-gesture-initialized audio-element analysis graph for live and menu playback, and reset its mouth level on playback stops; this avoids stream-arrival races and movement from unheard audio.
- Menu details use a nonmodal side panel (lower panel on narrow screens) so the robot remains visible.
- Derive pointing axes from child-bone offsets and preserve animation twist; keep gesture targets outside the body at shoulder height to avoid face collisions.
- Reserve a separate scene viewport beside or above menu details and keep one shared panel-position function for gestures and floating cards; framing stays aligned on resize.
