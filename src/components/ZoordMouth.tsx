import { createPortal, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { voiceLevel } from "@/lib/voice-level";
import { mouthShape } from "@/lib/zoord-mouth-shape";

export function ZoordMouth({ scene }: { scene: THREE.Object3D }) {
  const [head, setHead] = useState<THREE.Object3D | null>(null);
  const lips = useRef<THREE.Mesh>(null);
  const opening = useRef<THREE.Mesh>(null);
  const [ledColor, setLedColor] = useState<string>();
  const [cavityColor, setCavityColor] = useState<string>();
  useLayoutEffect(() => {
    setHead(scene.getObjectByName("mixamorig:Head") ?? scene.getObjectByName("mixamorigHead") ?? null);
    setLedColor(getComputedStyle(document.documentElement).getPropertyValue("--stage-led-cyan").trim());
    setCavityColor(getComputedStyle(document.documentElement).getPropertyValue("--stage-mouth-cavity").trim());
  }, [scene]);
  useFrame(() => {
    // No second envelope: it would smear syllables and keep moving after pauses.
    const shape = mouthShape(voiceLevel.v);
    lips.current?.scale.set(shape.width, shape.height, 0.6);
    opening.current?.scale.set(shape.width, shape.height, 1);
    if (lips.current?.material instanceof THREE.MeshBasicMaterial) lips.current.material.opacity = shape.opacity;
  });
  if (!head || !ledColor || !cavityColor) return null;
  return createPortal(
    <group name="ZoordVoiceMouth" position={[0, 5.2, 10.3]} rotation-x={0.524}>
      <mesh ref={opening} scale={[2.35, 0.10, 1]}>
        <circleGeometry args={[0.98, 48]} />
        <meshBasicMaterial color={cavityColor} toneMapped={false} />
      </mesh>
      <mesh ref={lips} position-z={0.04} scale={[2.35, 0.10, 0.6]}>
        <torusGeometry args={[1, 0.075, 8, 48]} />
        <meshBasicMaterial color={ledColor} transparent opacity={0.65} toneMapped={false} />
      </mesh>
    </group>, head,
  );
}