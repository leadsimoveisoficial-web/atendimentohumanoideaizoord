import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import universe from "@/assets/dakkai-universe.jpg";
export function UniverseBackdrop() {
  const texture = useTexture(universe);
  const scene = useThree(s => s.scene);
  useEffect(() => {
    const previous = scene.background;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
    return () => { scene.background = previous; };
  }, [scene, texture]);
  return null;
}
