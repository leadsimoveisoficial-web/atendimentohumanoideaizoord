"""Blender 4+: import Zoord, build nondestructive LED shape keys, optionally bake A2F JSON.
blender --background --python tools/blender/prepare_zoord.py -- --model zoord.glb --output /tmp/zoord-mouth.glb [--weights a2f.json]
"""
import argparse
import json
import math
import sys
from pathlib import Path


def load_weights(path):
    data = json.loads(Path(path).read_text())
    names = data.get("facsNames", [])
    frames = data.get("weightMat", [])
    fps = float(data.get("exportFps", 60))
    if not names or not frames or fps <= 0:
        raise ValueError("Expected Audio2Face facsNames, weightMat and positive exportFps")
    if any(len(row) != len(names) for row in frames):
        raise ValueError("Audio2Face frame length does not match facsNames")
    if any(not math.isfinite(float(value)) for row in frames for value in row):
        raise ValueError("Audio2Face weights must be finite")
    return names, frames, fps


def main():
    import bpy
    from mathutils import Matrix
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--weights")
    options = parser.parse_args(args)
    weights = load_weights(options.weights) if options.weights else None
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(Path(options.model).resolve()))
    armature = next((obj for obj in bpy.data.objects if obj.type == "ARMATURE" and "mixamorig:Head" in obj.data.bones), None)
    if armature is None:
        raise ValueError("Zoord head bone not found; refusing to alter another model")

    targets = {"jawOpen": (2, 1.15), "mouthClose": (2.35, 0.06), "mouthFunnel": (1.6, 0.85), "mouthPucker": (1.4, 0.35)}
    material = bpy.data.materials.new("Zoord LED cyan")
    material.diffuse_color = (0.247, 0.878, 1, 1)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = material.diffuse_color
    shader.inputs["Emission Color"].default_value = material.diffuse_color
    shader.inputs["Emission Strength"].default_value = 1

    for cavity in (False, True):
        if cavity:
            bpy.ops.mesh.primitive_circle_add(vertices=48, radius=0.98, fill_type="NGON")
        else:
            bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=8, major_radius=1, minor_radius=0.075)
        mouth = bpy.context.object
        mouth.name = "ZoordMouthCavity" if cavity else "ZoordLEDLips"
        # Convert the primitives' XY plane to Blender XZ (glTF's XY).
        source = [vertex.co.copy() for vertex in mouth.data.vertices]
        def shape(block, width, height):
            for point, original in zip(block.data, source):
                point.co = (original.x * width, -original.z * 0.6, original.y * height)
        basis = mouth.shape_key_add(name="Basis")
        shape(basis, 2.35, 0.10)
        for name, (width, height) in targets.items():
            shape(mouth.shape_key_add(name=name), width, height)
        mouth.parent = armature
        mouth.parent_type = "BONE"
        mouth.parent_bone = "mixamorig:Head"
        # Match the verified web overlay relative to the imported glTF head.
        bone = armature.data.bones["mixamorig:Head"]
        local = Matrix.Translation((0, -10.3, 11.5)) @ Matrix.Rotation(0.524, 4, "X")
        desired_world = armature.matrix_world @ bone.matrix_local @ local
        bpy.context.view_layer.update()
        mouth.matrix_world = desired_world
        if cavity:
            dark = bpy.data.materials.new("Zoord mouth cavity")
            dark.diffuse_color = (0.012, 0.02, 0.027, 1)
            mouth.data.materials.append(dark)
        else:
            mouth.data.materials.append(material)
        if weights:
            names, frames, fps = weights
            aliases = {"jawOpen": ("jawOpen", "Jaw_Open"), "mouthClose": ("mouthClose", "Mouth_Close"), "mouthFunnel": ("mouthFunnel", "Mouth_Funnel"), "mouthPucker": ("mouthPucker", "Mouth_Pucker")}
            matched = 0
            for name, variants in aliases.items():
                index = next((names.index(value) for value in variants if value in names), None)
                if index is None:
                    continue
                matched += 1
                key = mouth.data.shape_keys.key_blocks[name]
                for frame, values in enumerate(frames, 1):
                    key.value = max(0, min(1, float(values[index])))
                    key.keyframe_insert(data_path="value", frame=frame)
            if not matched:
                raise ValueError("No supported mouth weights; refusing to export an unanimated result")
            bpy.context.scene.render.fps = round(fps)
            bpy.context.scene.frame_end = len(frames)
    output = Path(options.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output.with_suffix(".blend")))
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_morph=True, export_animations=True)
    print("Exported LED shape keys; source face and baked necklace preserved.")


if __name__ == "__main__":
    main()