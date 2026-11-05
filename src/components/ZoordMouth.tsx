import { createPortal, useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { voiceLevel } from "@/lib/voice-level";
import { mouthShape } from "@/lib/zoord-mouth-shape";
import { applyAudioMouth, audioMouthPose, createMouthGeometry } from "@/lib/zoord-mouth-rig";

export function ZoordMouth({ scene, position = [0, 11.5, 10.3], rotationX = 0.524, scale = 1 }: { scene: THREE.Object3D; position?: [number, number, number]; rotationX?: number; scale?: number }) {
  const [head, setHead] = useState<THREE.Object3D | null>(null);
  const lips = useRef<THREE.Mesh>(null);
  const opening = useRef<THREE.Mesh>(null);
  const upper = useRef<THREE.Group>(null);
  const lower = useRef<THREE.Group>(null);
  const tongue = useRef<THREE.Mesh>(null);
  const [ledColor, setLedColor] = useState<string>();
  const [cavityColor, setCavityColor] = useState<string>();
  const [tongueColor, setTongueColor] = useState<string>();
  const [teethColor, setTeethColor] = useState<string>();
  const geometry = useMemo(() => ({ lips: createMouthGeometry(), cavity: createMouthGeometry(true) }), []);
  useEffect(() => () => { geometry.lips.dispose(); geometry.cavity.dispose(); }, [geometry]);
  useLayoutEffect(() => {
    setHead(scene.getObjectByName("mixamorig:Head") ?? scene.getObjectByName("mixamorigHead") ?? null);
    setLedColor(getComputedStyle(document.documentElement).getPropertyValue("--stage-mouth-lips").trim());
    setCavityColor(getComputedStyle(document.documentElement).getPropertyValue("--stage-mouth-cavity").trim());
    setTongueColor(getComputedStyle(document.documentElement).getPropertyValue("--stage-mouth-tongue").trim());
    setTeethColor(getComputedStyle(document.documentElement).getPropertyValue("--stage-mouth-teeth").trim());
  }, [scene]);
  useFrame(() => {
    // No second envelope: it would smear syllables and keep moving after pauses.
    const shape = mouthShape(voiceLevel.v);
    if (import.meta.env.DEV) (window as unknown as { __voiceLevel?: typeof voiceLevel }).__voiceLevel = voiceLevel;
    applyAudioMouth(lips.current, voiceLevel.v, voiceLevel.round, voiceLevel.wide);
    applyAudioMouth(opening.current, voiceLevel.v, voiceLevel.round, voiceLevel.wide);
    // Teeth and tongue follow the measured opening height; hidden when the mouth is closed.
    const pose = audioMouthPose(voiceLevel.v, voiceLevel.round, voiceLevel.wide);
    const h = pose.height;
    const show = pose.visible;
    const detailScale = Math.min(1, Math.max(0, (h - 0.16) / 0.3));
    // Preserve the supplied closed lips in silence; no second luminous line below them.
    if (lips.current) lips.current.visible = show;
    if (opening.current) opening.current.visible = show;
    if (upper.current) { upper.current.visible = show && detailScale > 0; upper.current.position.y = h * 0.60; upper.current.scale.set(pose.width / 2.35, detailScale, 1); }
    if (lower.current) { lower.current.visible = show && h > 0.32; lower.current.position.y = -h * 0.60; lower.current.scale.set(pose.width / 2.35 * 0.85, detailScale, 1); }
    if (tongue.current) { tongue.current.visible = show && h > 0.25; tongue.current.position.y = -h * 0.45; tongue.current.scale.set(pose.width * 0.46, h * 0.24, 1); }
    if (lips.current?.material instanceof THREE.MeshBasicMaterial) lips.current.material.opacity = shape.opacity;
  });
  if (!head || !ledColor || !cavityColor || !tongueColor || !teethColor) return null;
  // Head parenting keeps the approved lip placement aligned in the same render,
  // without copying a world matrix before the final gaze/gesture layers run.
  return createPortal(
    <group name="ZoordVoiceMouth" position={position} rotation-x={rotationX} scale={scale}>
      <mesh ref={opening} args={[geometry.cavity]}>
        <meshBasicMaterial color={cavityColor} toneMapped={false} />
      </mesh>
      <mesh ref={tongue} position-z={0.01}>
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color={tongueColor} roughness={0.45} />
      </mesh>
      <group ref={upper} position-z={0.02}>
          <mesh position-x={-1.53}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={-1.19}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={-0.85}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={-0.51}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={-0.17}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={0.17}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={0.51}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={0.85}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={1.19}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={1.53}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
      </group>
      <group ref={lower} position-z={0.02} scale-x={0.85}>
          <mesh position-x={-1.53}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={-1.19}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={-0.85}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={-0.51}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={-0.17}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={0.17}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={0.51}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={0.85}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={1.19}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
          <mesh position-x={1.53}><boxGeometry args={[0.3, 0.28, 0.04]} /><meshBasicMaterial color={teethColor} toneMapped={false} /></mesh>
      </group>
      <mesh ref={lips} position-z={0.04} args={[geometry.lips]}>
        <meshBasicMaterial color={ledColor} transparent opacity={0.65} toneMapped={false} />
      </mesh>
    </group>, head
  );
}