import { createPortal, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { voiceLevel } from "@/lib/voice-level";

export function ZoordMouth({ scene }: { scene: THREE.Object3D }) {
  const [head, setHead] = useState<THREE.Object3D | null>(null);
  const bars = useRef<THREE.Group>(null);
  const envelope = useRef(0);
  useLayoutEffect(() => {
    setHead(scene.getObjectByName("mixamorig:Head") ?? scene.getObjectByName("mixamorigHead") ?? null);
  }, [scene]);
  useFrame((_, rawDelta) => {
    const level = THREE.MathUtils.damp(envelope.current, voiceLevel.v, 22, Math.min(rawDelta, 0.05));
    envelope.current = level;
    bars.current?.children.forEach((object, i) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.scale.y = 0.16 + level * (0.5 + (1 - Math.abs(i - 3) / 4) * 1.5);
      const material = object.material;
      if (material instanceof THREE.MeshBasicMaterial) material.opacity = 0.55 + level * 0.45;
    });
  });
  if (!head) return null;
  return createPortal(
    <group name="ZoordVoiceMouth" position={[0, 3.5, 10.8]} rotation-x={0.524}>
      <group ref={bars}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position-x={(i - 3) * 0.7}>
            <boxGeometry args={[0.48, 1.5, 0.18]} />
            <meshBasicMaterial color="var(--glow)" transparent toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>, head,
  );
}