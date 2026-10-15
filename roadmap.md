# Roadmap

- [ ] Replace Zoord with the uploaded Cyber Hero, adapt its built-in animations and audio mouth, and verify wave/menu gestures in the browser

- [x] Prepare offline Blender LED shape-key and Audio2Face-weight bake scripts; syntax checked
- [ ] Execute Blender/Audio2Face export and import verified GLB — blocked by unavailable Blender/RTX Audio2Face service and real weight export
- [x] Apply audio-driven jawOpen morph on the LED lips using the shared approved-voice playback meter; browser measured 0.46 on sound and 0 on pause, no runtime errors
- [ ] Test a real customer conversation with greeting wave and moving mouth — microphone ICE gathering fails before the service connection in the sandbox; no audible conversation verified
- [x] Refine outward menu gesture with lowered elbow and subtle head turn; side menu visible beside/under unobstructed stage in desktop/mobile checks
- [ ] Adjust baked necklace independently — requires artist editing the original character mesh in Blender; preserved rather than destructively moving neck bones
- [x] Correct camera attachment after video mounts; synthetic camera delivered 640×480 frames in browser (not the user's camera)

- [x] Implement transcript-triggered greeting wave and gentle head motion; greeting unit tests passed and stage remains visible without runtime errors
- [ ] Verify greeting and listening movements during an audible real call — blocked by WebRTC media connection in the test environment
- [x] Clarify Blender visemes versus current audio-amplitude mouth without claiming phoneme lip sync

- [x] Remove the white light from Zoord (white key spotlight, white overhead light, white ring under him)
- [x] Make the stage render sharp and crisp at 4K (resolution, pixel ratio, bloom and edge quality)
- [x] Keep the stage light and fluid (balanced resolution, lighter floor reflections, smaller shadows, fewer particles)
- [x] Replace menu data with the full real Dakkai menu (prices from menudino screenshots)
- [x] Save Dakkai menu facts to memory
- [x] Floating menu pages only behind Zoord — he is the screen highlight
- [x] Verify the stage in the browser and show the user a screenshot
- [x] Zoord points at menu + brain beam + browser voice presentation
- [x] Replace browser speech with the approved live voice controller
- [x] Attach a voice-reactive cyan LED mouth to Zoord's animated head
- [x] Mount the live conversation panel and verify start/error states
- [x] Open the menu beside Zoord without covering his face
- [x] Route clicked categories and full presentation through the approved live voice
- [ ] Verify audible live voice and mouth synchronization — blocked by WebRTC media connection in the test environment
- [x] Synchronize the LED mouth with audible playback, including menu speech, pauses, and Stop — unit tests and real browser audio bursts passed; full live voice check remains blocked above
- [x] Correct presentation gestures using measured child-bone axes and outward shoulder-height targets
- [x] Refine stage framing and side menu layout using the posture reference
- [x] Replace equalizer bars with closed-at-rest lips driven by output amplitude; verified open/closed geometry and corrected the anchor from throat to actual lips (full live call remains blocked above)

- [x] Record visitor voice and have Zoord replay it with the audio-driven mouth, without the call
- [ ] Real camera + call connection — browser permissions already request the real camera/mic; media connection still fails only inside the sandbox, needs testing on the user's device
- [ ] Blender/Audio2Face export — blocked: no Blender or RTX GPU here
- [ ] Necklace adjustment — needs artist in Blender
- [x] Redo posture and menu pointing in code (chest lean toward panel); necklace remains baked in the mesh, artist-only
- [ ] Verify live call + camera on the user's phone over the HTTPS preview
