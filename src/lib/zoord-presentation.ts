import * as THREE from "three";

/** Keep the supplied hand/head performance, but never animate the planted lower body. */
export function plantedPresentationClip(clip: THREE.AnimationClip) {
  const copy = clip.clone();
  copy.tracks = copy.tracks.filter((track) => {
    const binding = THREE.PropertyBinding.parseTrackName(track.name);
    const node = binding.nodeName ?? "";
    if (/Hips|(?:Left|Right)(?:UpLeg|Leg|Foot|ToeBase)/i.test(node)) return false;
    // Root motion is locomotion, not part of a stationary maître's presentation.
    if (!/mixamorig/i.test(node) && /position|quaternion|scale/.test(binding.propertyName)) return false;
    return true;
  });
  return copy;
}