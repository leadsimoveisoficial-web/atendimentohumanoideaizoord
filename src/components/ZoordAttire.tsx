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
 * Bone-local units follow the supplied Mixamo rig (same space as ZoordMouth).
 */
export function ZoordAttire({ scene }: { scene: THREE.Object3D }) {
  const [head, setHead] = useState<THREE.Object3D | null>(null);
  const [spine, setSpine] = useState<THREE.Object3D | null>(null);
  const bandTexture = useHachimakiTexture();

  useLayoutEffect(() => {
    setHead(scene.getObjectByName("mixamorig:Head") ?? scene.getObjectByName("mixamorigHead") ?? null);
    setSpine(scene.getObjectByName("mixamorig:Spine2") ?? scene.getObjectByName("mixamorigSpine2") ?? null);
  }, [scene]);

  const black = useMemo(() => new THREE.MeshStandardMaterial({ color: "#151319", roughness: 0.75, metalness: 0.05 }), []);
  const red = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c4141f", roughness: 0.6, metalness: 0.05 }), []);
  const cloth = useMemo(() => new THREE.MeshStandardMaterial({ map: bandTexture, roughness: 0.85, metalness: 0 }), [bandTexture]);

  if (!head || !spine) return null;
  return (
    <>
      {createPortal(
        <group name="ZoordHachimaki" position={[0, 9.2, 0.6]} rotation-x={-0.06}>
          {/* Cloth band wrapped around the head. */}
          <mesh material={cloth}>
            <cylinderGeometry args={[5.6, 5.75, 2.1, 48, 1, true]} />
          </mesh>
          {/* Knot and two hanging ties at the back. */}
          <mesh material={red} position={[0, 0.1, -5.6]}>
            <sphereGeometry args={[0.9, 16, 12]} />
          </mesh>
          <mesh material={cloth} position={[-0.7, -2.2, -5.9]} rotation-z={0.18} rotation-x={0.12}>
            <boxGeometry args={[1.1, 4.4, 0.18]} />
          </mesh>
          <mesh material={cloth} position={[0.8, -2.5, -5.8]} rotation-z={-0.22} rotation-x={0.18}>
            <boxGeometry args={[1.1, 4.9, 0.18]} />
          </mesh>
        </group>,
        head,
      )}
      {createPortal(
        <group name="ZoordHappi" position={[0, -6.5, 0]}>
          {/* Happi jacket body over the torso. */}
          <mesh material={black}>
            <cylinderGeometry args={[7.4, 9.2, 15, 32, 1, true]} />
          </mesh>
          {/* Red lapel strips crossing at the chest. */}
          <mesh material={red} position={[-2.1, 4.4, 6.6]} rotation-z={0.42} rotation-x={0.08}>
            <boxGeometry args={[1.5, 9.5, 0.3]} />
          </mesh>
          <mesh material={red} position={[2.1, 4.4, 6.6]} rotation-z={-0.42} rotation-x={0.08}>
            <boxGeometry args={[1.5, 9.5, 0.3]} />
          </mesh>
          {/* Red obi belt with a front knot. */}
          <mesh material={red} position={[0, -5.6, 0]}>
            <cylinderGeometry args={[9.45, 9.6, 2.4, 32, 1, true]} />
          </mesh>
          <mesh material={red} position={[0, -5.6, 9.2]}>
            <boxGeometry args={[2.6, 1.8, 1]} />
          </mesh>
          {/* Short black sleeve cuffs with red trim at the shoulders. */}
          <mesh material={black} position={[-8.6, 5.4, 0]} rotation-z={1.35}>
            <cylinderGeometry args={[3.1, 3.4, 4.6, 20, 1, true]} />
          </mesh>
          <mesh material={black} position={[8.6, 5.4, 0]} rotation-z={-1.35}>
            <cylinderGeometry args={[3.1, 3.4, 4.6, 20, 1, true]} />
          </mesh>
          <mesh material={red} position={[-10.6, 4.6, 0]} rotation-z={1.35}>
            <cylinderGeometry args={[3.45, 3.55, 0.9, 20, 1, true]} />
          </mesh>
          <mesh material={red} position={[10.6, 4.6, 0]} rotation-z={-1.35}>
            <cylinderGeometry args={[3.45, 3.55, 0.9, 20, 1, true]} />
          </mesh>
        </group>,
        spine,
      )}
    </>
  );
}
