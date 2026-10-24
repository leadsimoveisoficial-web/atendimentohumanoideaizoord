import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
 * Sushi-chef attire for Zoord: a hachimaki headband (peace kanji) following the
 * head bone and a black happi jacket with red details following the torso bone.
 * The groups live in world space and copy the bone matrices every frame, so the
 * clothing tracks animation without touching the supplied rig.
 * Bone-local units follow the Mixamo rig (world = local × 0.023). Measured on
 * the model: head half-width 6.4 local, head depth ~10.5 local (z), torso
 * ~8.4 wide but ~17.5 deep — the shells are stretched on z to wrap the body.
 */
/** Forehead offset above the head bone origin, in world units. */
const _bandOffset = new THREE.Vector3(0, 0.21, 0.02);

export function ZoordAttire({ scene }: { scene: THREE.Object3D }) {
  const [head, setHead] = useState<THREE.Object3D | null>(null);
  const [spine, setSpine] = useState<THREE.Object3D | null>(null);
  const bandTexture = useHachimakiTexture();
  const hachimaki = useRef<THREE.Group>(null);
  const happi = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    setHead(scene.getObjectByName("mixamorig:Head") ?? scene.getObjectByName("mixamorigHead") ?? null);
    setSpine(scene.getObjectByName("mixamorig:Spine2") ?? scene.getObjectByName("mixamorigSpine2") ?? null);
  }, [scene]);

  const headPos = useMemo(() => new THREE.Vector3(), []);
  const headQuat = useMemo(() => new THREE.Quaternion(), []);
  useFrame(() => {
    // Hachimaki: world-space offset above the head bone (its local axes are not world-up).
    if (head && hachimaki.current) {
      head.updateWorldMatrix(true, false);
      head.getWorldPosition(headPos);
      head.getWorldQuaternion(headQuat);
      const g = hachimaki.current;
      g.position.copy(headPos).add(_bandOffset);
      g.quaternion.copy(headQuat);
    }
    // Happi: copy the torso bone matrix (bone-local units, world = local × 0.023).
    if (spine && happi.current) {
      spine.updateWorldMatrix(true, false);
      happi.current.matrixAutoUpdate = false;
      happi.current.matrix.copy(spine.matrixWorld);
      happi.current.matrixWorldNeedsUpdate = true;
    }
  });

  const black = useMemo(() => new THREE.MeshStandardMaterial({ color: "#151319", roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide }), []);
  const red = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c4141f", roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide }), []);
  const cloth = useMemo(() => new THREE.MeshStandardMaterial({ map: bandTexture, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }), [bandTexture]);

  if (!head || !spine) return null;
  return (
    <>
      <group name="ZoordHachimaki" ref={hachimaki}>
        {/* World units: band around the forehead, kanji facing forward. */}
        <mesh material={cloth} scale={[1, 1, 1.45]} rotation-y={Math.PI}>
          <cylinderGeometry args={[0.2, 0.205, 0.095, 48, 1, true]} />
        </mesh>
        {/* Knot and two hanging ties at the back. */}
        <mesh material={red} position={[0, 0.005, -0.27]}>
          <sphereGeometry args={[0.03, 16, 12]} />
        </mesh>
        <mesh material={cloth} position={[-0.022, -0.09, -0.28]} rotation-z={0.16} rotation-x={0.14}>
          <boxGeometry args={[0.034, 0.16, 0.006]} />
        </mesh>
        <mesh material={cloth} position={[0.025, -0.1, -0.275]} rotation-z={-0.2} rotation-x={0.2}>
          <boxGeometry args={[0.034, 0.17, 0.006]} />
        </mesh>
      </group>
      <group name="ZoordHappi" ref={happi}>
        {/* Happi jacket body: shoulders (y +2) down over the hips (y -31). */}
        <mesh material={black} position={[0, -14.5, 0]} scale={[1, 1, 1.75]}>
          <cylinderGeometry args={[8.6, 11.2, 33, 32, 1, true]} />
        </mesh>
        {/* Red lapel strips crossing at the chest. */}
        <mesh material={red} position={[-2.1, -3, 14.6]} rotation-z={0.4} rotation-x={0.06}>
          <boxGeometry args={[1.7, 13, 0.4]} />
        </mesh>
        <mesh material={red} position={[2.1, -3, 14.6]} rotation-z={-0.4} rotation-x={0.06}>
          <boxGeometry args={[1.7, 13, 0.4]} />
        </mesh>
        {/* Red obi belt at the waist with a front knot. */}
        <mesh material={red} position={[0, -26, 0]} scale={[1, 1, 1.75]}>
          <cylinderGeometry args={[10.8, 11.1, 3.2, 32, 1, true]} />
        </mesh>
        <mesh material={red} position={[0, -26, 18.6]}>
          <boxGeometry args={[3.2, 2.4, 1.2]} />
        </mesh>
        {/* Short black sleeves with red trim over the shoulders. */}
        <mesh material={black} position={[-16.6, 0.5, 0]} rotation-z={1.45} scale={[1, 1, 1.5]}>
          <cylinderGeometry args={[4.2, 4.6, 8, 20, 1, true]} />
        </mesh>
        <mesh material={black} position={[16.6, 0.5, 0]} rotation-z={-1.45} scale={[1, 1, 1.5]}>
          <cylinderGeometry args={[4.2, 4.6, 8, 20, 1, true]} />
        </mesh>
        <mesh material={red} position={[-20.3, -0.6, 0]} rotation-z={1.45} scale={[1, 1, 1.5]}>
          <cylinderGeometry args={[4.65, 4.75, 1.2, 20, 1, true]} />
        </mesh>
        <mesh material={red} position={[20.3, -0.6, 0]} rotation-z={-1.45} scale={[1, 1, 1.5]}>
          <cylinderGeometry args={[4.65, 4.75, 1.2, 20, 1, true]} />
        </mesh>
      </group>
    </>
  );
}
