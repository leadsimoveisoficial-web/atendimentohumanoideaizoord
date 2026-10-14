import { createPortal, useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { voiceLevel } from "@/lib/voice-level";
import { mouthShape } from "@/lib/zoord-mouth-shape";
import { applyAudioMouth, createMouthGeometry } from "@/lib/zoord-mouth-rig";

export function ZoordMouth({ scene }: { scene: THREE.Object3D }) {
  const [head, setHead] = useState<THREE.Object3D | null>(null);
  const lips = useRef<THREE.Mesh>(null);
  const opening = useRef<THREE.Mesh>(null);
  const [ledColor, setLedColor] = useState<string>();
  const [cavityColor, setCavityColor] = useState<string>();
  const geometry = useMemo(() => ({ lips: createMouthGeometry(), cavity: createMouthGeometry(true) }), []);
  useEffect(() => () => { geometry.lips.dispose(); geometry.cavity.dispose(); }, [geometry]);
  useLayoutEffect(() => {
    setHead(scene.getObjectByName("mixamorig:Head") ?? scene.getObjectByName("mixamorigHead") ?? null);
    setLedColor(getComputedStyle(document.documentElement).getPropertyValue("--stage-led-cyan").trim());
    setCavityColor(getComputedStyle(document.documentElement).getPropertyValue("--stage-mouth-cavity").trim());
  }, [scene]);
  useFrame(() => {
    // No second envelope: it would smear syllables and keep moving after pauses.
    const shape = mouthShape(voiceLevel.v);
    applyAudioMouth(lips.current, voiceLevel.v);
    applyAudioMouth(opening.current, voiceLevel.v);
    if (lips.current?.material instanceof THREE.MeshBasicMaterial) lips.current.material.opacity = shape.opacity;
  });
  if (!head || !ledColor || !cavityColor) return null;
  return createPortal(
    <group name="ZoordVoiceMouth" position={[0, 11.5, 10.3]} rotation-x={0.524}>
      <mesh ref={opening} args={[geometry.cavity]}>
        <meshBasicMaterial color={cavityColor} toneMapped={false} />
      </mesh>
      <mesh ref={lips} position-z={0.04} args={[geometry.lips]}>
        <meshBasicMaterial color={ledColor} transparent opacity={0.65} toneMapped={false} />
      </mesh>
    </group>, head,
  );
}