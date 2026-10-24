import { createPortal } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useState } from "react";
import * as THREE from "three";

/** White hachimaki cloth with the black kanji 平和 (peace) on the front. */
function useHachimakiTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f4efe4";
    ctx.fillRect(0, 0, 1024, 128);
    // Subtle fabric weave.
    ctx.fillStyle = "rgba(0,0,0,0.04)";
    for (let y = 0; y < 128; y += 4) ctx.fillRect(0, y, 1024, 1);
    // Peace kanji centered on the front of the band.
    ctx.fillStyle = "#14100c";
    ctx.font = "bold 92px 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("平和", 512, 68);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);
}

/**
 * Sushi-chef attire for Zoord: a hachimaki headband (peace kanji) on the head
 * bone and a black happi jacket with red details on the torso bone.
 * Bone-local units follow the supplied Mixamo rig (world = local × 0.023).
 * Measured anchors: head world y 3.61, shoulders ±0.36/3.27, spine2 3.23,
 * waist ~2.63, hips 2.50.
 */
export function ZoordAttire({ scene }: { scene: THREE.Object3D }) {
  const [head, setHead] = useState<THREE.Object3D | null>(null);
  const [spine, setSpine] = useState<THREE.Object3D | null>(null);
  const bandTexture = useHachimakiTexture();

  useLayoutEffect(() => {
    setHead(scene.getObjectByName("mixamorig:Head") ?? scene.getObjectByName("mixamorigHead") ?? null);
    setSpine(scene.getObjectByName("mixamorig:Spine2") ?? scene.getObjectByName("mixamorigSpine2") ?? null);
  }, [scene]);

  const black = useMemo(() => new THREE.MeshStandardMaterial({ color: "#151319", roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide }), []);
  const red = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c4141f", roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide }), []);
  const cloth = useMemo(() => new THREE.MeshStandardMaterial({ map: bandTexture, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }), [bandTexture]);

  if (!head || !spine) return null;
  return (
    <>
      {createPortal(
        <group name="ZoordHachimaki" position={[0, 5, 1]} rotation-x={-0.05}>
          {/* Cloth band wrapped around the forehead. */}
          <mesh material={cloth}>
            <cylinderGeometry args={[5.5, 5.7, 3.2, 48, 1, true]} />
          </mesh>
          {/* Knot and two hanging ties at the back. */}
          <mesh material={red} position={[0, 0.2, -5.6]}>
            <sphereGeometry args={[1, 16, 12]} />
          </mesh>
          <mesh material={cloth} position={[-0.8, -3.4, -5.8]} rotation-z={0.16} rotation-x={0.14}>
            <boxGeometry args={[1.3, 6, 0.2]} />
          </mesh>
          <mesh material={cloth} position={[0.9, -3.8, -5.7]} rotation-z={-0.2} rotation-x={0.2}>
            <boxGeometry args={[1.3, 6.6, 0.2]} />
          </mesh>
        </group>,
        head,
      )}
      {createPortal(
        <group name="ZoordHappi" position={[0, 0, 0]}>
          {/* Happi jacket body: shoulders (y +3) down over the hips (y -30). */}
          <mesh material={black} position={[0, -13.5, 0]}>
            <cylinderGeometry args={[7.6, 9.4, 33, 32, 1, true]} />
          </mesh>
          {/* Red lapel strips crossing at the chest. */}
          <mesh material={red} position={[-1.9, -2.5, 6.9]} rotation-z={0.4} rotation-x={0.06}>
            <boxGeometry args={[1.6, 12, 0.35]} />
          </mesh>
          <mesh material={red} position={[1.9, -2.5, 6.9]} rotation-z={-0.4} rotation-x={0.06}>
            <boxGeometry args={[1.6, 12, 0.35]} />
          </mesh>
          {/* Red obi belt at the waist with a front knot. */}
          <mesh material={red} position={[0, -26, 0]}>
            <cylinderGeometry args={[9.1, 9.3, 3, 32, 1, true]} />
          </mesh>
          <mesh material={red} position={[0, -26, 8.9]}>
            <boxGeometry args={[3, 2.2, 1.1]} />
          </mesh>
          {/* Short black sleeves with red trim over the shoulders. */}
          <mesh material={black} position={[-16.4, 0.5, 0]} rotation-z={1.45}>
            <cylinderGeometry args={[3.6, 4, 7, 20, 1, true]} />
          </mesh>
          <mesh material={black} position={[16.4, 0.5, 0]} rotation-z={-1.45}>
            <cylinderGeometry args={[3.6, 4, 7, 20, 1, true]} />
          </mesh>
          <mesh material={red} position={[-19.6, -0.4, 0]} rotation-z={1.45}>
            <cylinderGeometry args={[4.05, 4.15, 1.1, 20, 1, true]} />
          </mesh>
          <mesh material={red} position={[19.6, -0.4, 0]} rotation-z={-1.45}>
            <cylinderGeometry args={[4.05, 4.15, 1.1, 20, 1, true]} />
          </mesh>
        </group>,
        spine,
      )}
    </>
  );
}
