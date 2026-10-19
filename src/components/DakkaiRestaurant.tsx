import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import restaurant from "@/assets/dakkai-restaurant-4k.glb.asset.json";
import { RestaurantLeds } from "./RestaurantLeds";

/** The restaurant is a separate static backdrop; Zoord's rig stays untouched. */
export function DakkaiRestaurant() {
  const { scene } = useGLTF(restaurant.url);
  const anisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const object = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    const factor = 19 / Math.max(size.x, size.z, 0.001);
    clone.scale.setScalar(factor);
    clone.updateWorldMatrix(true, true);
    const scaled = new THREE.Box3().setFromObject(clone);
    const center = scaled.getCenter(new THREE.Vector3());
    // Center the latest model's circular dais under the unchanged feet at y=0.3.
    clone.position.set(-center.x - 1.7, -scaled.min.y - 1.81072, 5.2 - scaled.max.z);
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.receiveShadow = true;
      child.castShadow = false;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const clonedMaterials = materials.map((source) => {
        const material = source.clone();
        if (material instanceof THREE.MeshStandardMaterial) {
          material.roughness = Math.max(material.roughness, 0.65);
          material.metalness = Math.min(material.metalness, 0.25);
          if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
          for (const texture of [material.map, material.normalMap, material.roughnessMap]) {
            if (texture) {
              texture.anisotropy = anisotropy;
              texture.minFilter = THREE.LinearMipmapLinearFilter;
              texture.magFilter = THREE.LinearFilter;
              texture.generateMipmaps = true;
              texture.needsUpdate = true;
            }
          }
        }
        return material;
      });
      child.material = Array.isArray(child.material) ? clonedMaterials : (clonedMaterials[0] ?? child.material);
    });
    return clone;
  }, [scene, anisotropy]);
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __dakkaiRestaurant?: THREE.Object3D }).__dakkaiRestaurant = object;
    return () => {
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      });
    };
  }, [object]);
  return <group><primitive object={object} dispose={null} /><RestaurantLeds /></group>;
}