# Zoord mouth preparation

This is an **offline preparation script**, not an Audio2Face service. It has not been executed in this workspace: Blender and an RTX Audio2Face service are unavailable.

The supplied character has no facial morph targets. The script preserves the original face, skeleton and baked necklace, and creates a separate LED lip overlay with `Basis`, `jawOpen`, `mouthClose`, `mouthFunnel` and `mouthPucker`. These are not professionally sculpted face visemes (A/E/I/O/U, M/B/P, F/V).

## Blender 4+ preparation

```sh
blender --background --python tools/blender/prepare_zoord.py -- \
  --model /path/to/zoord.glb --output /path/to/zoord-mouth.glb
```

Inspect mouth position and shape keys in the resulting `.blend` before replacing any web asset. The visual web mouth anchor is deliberately preserved; the model's `headfront` node is not the verified lip position.

## Bake an actual Audio2Face result

Prepare/transfer compatible blendshapes in NVIDIA Audio2Face and export blendshape weights as JSON with `facsNames`, `weightMat`, and `exportFps`. Then:

```sh
blender --background --python tools/blender/prepare_zoord.py -- \
  --model /path/to/zoord.glb --output /path/to/zoord-mouth.glb \
  --weights /path/to/audio2face-weights.json
```

Only matching mouth weights are baked; the rest are intentionally ignored. The animation corresponds to the **same recorded audio**, not arbitrary future speech. Real-time Audio2Face requires a GPU service, outgoing-audio processing and timestamped weights aligned with actual playback. Do not loop a prerecorded animation over a live conversation.

For realistic original-face speech, an artist must sculpt and inspect the facial shape keys on the original mesh in Blender. Do not deform its baked necklace automatically.

References:
- https://docs.omniverse.nvidia.com/connect/latest/blender/audio2face.html
- https://docs.omniverse.nvidia.com/audio2face/latest/user-manual/livelink-blendshape-streaming.html