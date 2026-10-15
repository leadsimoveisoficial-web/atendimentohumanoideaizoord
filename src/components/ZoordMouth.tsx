import { createPortal, useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { voiceLevel } from "@/lib/voice-level";
import { mouthShape } from "@/lib/zoord-mouth-shape";
import { applyAudioMouth, createMouthGeometry } from "@/lib/zoord-mouth-rig";

export function ZoordMouth({ scene, position = [0, 11.5, 10.3], rotationX = 0.524 }: { scene: THREE.Object3D; position?: [number, number, number]; rotationX?: number }) {
  const [head, setHead] = useState<THREE.Object3D | null>(null);
  const lips = useRef<THREE.Mesh>(null);
  const opening = useRef<THREE.Mesh>(null);
  const upper = useRef<THREE.Group>(null);
  const lower = useRef<THREE.Group>(null);
  const tongue = useRef<THREE.Mesh>(null);
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
    if (import.meta.env.DEV) (window as unknown as { __voiceLevel?: typeof voiceLevel }).__voiceLevel = voiceLevel;
    applyAudioMouth(lips.current, voiceLevel.v, voiceLevel.round, voiceLevel.wide);
    applyAudioMouth(opening.current, voiceLevel.v, voiceLevel.round, voiceLevel.wide);
    // Teeth and tongue follow the measured opening height; hidden when the mouth is closed.
    const a = Math.max(0, Math.min(1, voiceLevel.v));
    const h = 0.1 + a * (1.05 - 0.4 * voiceLevel.round);
    const show = a > 0.04;
    if (upper.current) { upper.current.visible = show; upper.current.position.y = h * 0.78; }
    if (lower.current) { lower.current.visible = show && a > 0.18; lower.current.position.y = -h * 0.82; }
    if (tongue.current) { tongue.current.visible = show && a > 0.12; tongue.current.position.y = -h * 0.45; tongue.current.scale.set(1.15, 0.35 + a * 0.4, 1); }
    if (lips.current?.material instanceof THREE.MeshBasicMaterial) lips.current.material.opacity = shape.opacity;
  });
  if (!head || !ledColor || !cavityColor) return null;
  return createPortal(
    <group name="ZoordVoiceMouth" position={position} rotation-x={rotationX}>
      <mesh ref={opening} args={[geometry.cavity]}>
        <meshBasicMaterial color={cavityColor} toneMapped={false} />
      </mesh>
      <mesh ref={tongue} position-z={0.01}>
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color="#b3121f" roughness={0.45} />
      </mesh>
      <group ref={upper} position-z={0.02}>
          <mesh position-x={-1.53}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={-1.19}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={-0.85}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={-0.51}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={-0.17}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={0.17}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={0.51}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={0.85}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={1.19}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={1.53}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
      </group>
      <group ref={lower} position-z={0.02} scale-x={0.85}>
          <mesh position-x={-1.53}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={-1.19}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={-0.85}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={-0.51}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={-0.17}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={0.17}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={0.51}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={0.85}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={1.19}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
          <mesh position-x={1.53}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshStandardMaterial color="#f4f1ea" roughness={0.35} /></mesh>
      </group>
      <mesh ref={lips} position-z={0.04} args={[geometry.lips]}>
        <meshBasicMaterial color={ledColor} transparent opacity={0.65} toneMapped={false} />
      </mesh>
    </group>, head,
  );
}