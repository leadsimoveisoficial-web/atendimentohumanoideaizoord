import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  useAnimations,
  Environment,
  Lightformer,
  useTexture,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { gaze, setMouseGaze } from "@/lib/gaze";
import zoord from "@/assets/zoord-new.glb.asset.json";
import dakkaiLogo from "@/assets/dakkai-logo.png";
import { LiveZoord, type LiveZoordCommands } from "./LiveZoord";
import { voiceLevel } from "@/lib/voice-level";
import { ZoordMouth } from "./ZoordMouth";
import { SecurityBadge } from "./SecurityBadge";
import { RecordRepeat } from "./RecordRepeat";
import { Button } from "@/components/ui/button";
import { OrderTicket, type TicketState } from "./OrderTicket";
import { supabase } from "@/integrations/supabase/client";
import type { NewOrder } from "@/lib/orders";
import { MENU, WHATSAPP, ORDER_URL } from "./menu";
import { aimLimb } from "@/lib/zoord-gesture";
import { PoseLayer } from "@/lib/zoord-pose";
import { plantedPresentationClip } from "@/lib/zoord-presentation";
import { RadioPlayer } from "./RadioPlayer";
import { danceMotion, musicLevel } from "@/lib/music";
import { HOST_MOTION, hostBreathing, hostDanceTarget, motionStep, smoothMotion } from "@/lib/zoord-motion";
import { GesturePanel, type StageGesture } from "./GesturePanel";
import { Hand, UtensilsCrossed, X, RotateCcw } from "lucide-react";
import { UserAccount } from "./UserAccount";
import { DakkaiRestaurant } from "./DakkaiRestaurant";
import { CounterVitrine } from "./CounterVitrine";
import { UniverseBackdrop } from "./UniverseBackdrop";

const stageColors = { cyan: "", blue: "", red: "", space: "", backing: "" };

// The menu opens as a side panel on the viewer's right: Zoord points there.
export function panelPos(i: number) {
  const row = Math.min(Math.max(i, 0), MENU.length - 1);
  return new THREE.Vector3(3.6, 4.3 - (row % 4) * 0.35, -1.0);
}

const _id = new THREE.Quaternion();

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
function Robot({ anim, point, listening, waveId, onWaveEnd }: { anim: string; point: number | null; listening: boolean; waveId: number; onWaveEnd: () => void }) {
  const group = useRef<THREE.Group>(null);
  const { scene: sourceScene, animations } = useGLTF(zoord.url);
  const scene = useMemo(() => cloneSkeleton(sourceScene), [sourceScene]);
  const bones = useMemo(() => {
    const cache = new Map<string, THREE.Object3D>();
    scene.traverse((node) => {
      if (/mixamorig/i.test(node.name)) cache.set(node.name.replace(/^mixamorig:?/i, ""), node);
    });
    return cache;
  }, [scene]);
  const reduced = useRef(false);
  const motionTime = useRef(0);
  const danceWeight = useRef(0);
  const previousAction = useRef<THREE.AnimationAction | null>(null);
  const breath = useMemo(() => ({ quaternion: new THREE.Quaternion(), euler: new THREE.Euler() }), []);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reduced.current = preference.matches; };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  // Preserve the uploaded albedo under the saturated stage lights, without adding white lights.
  useEffect(() => {
    const ownedMaterials: THREE.MeshStandardMaterial[] = [];
    const albedo = getComputedStyle(document.documentElement).getPropertyValue("--stage-avatar-albedo").trim();
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const prepare = (source: THREE.Material) => {
        if (!(source instanceof THREE.MeshStandardMaterial)) return source;
        const mat = source.clone();
        ownedMaterials.push(mat);
        for (const tex of [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap]) {
          if (tex) { tex.anisotropy = maxAniso; tex.needsUpdate = true; }
        }
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.emissiveMap = mat.map;
          mat.emissive.set(albedo);
          mat.emissiveIntensity = 0.55;
        }
        mat.envMapIntensity = 0.15;
        mat.needsUpdate = true;
        return mat;
      };
      o.material = Array.isArray(o.material) ? o.material.map(prepare) : prepare(o.material);
    });
    return () => { for (const material of ownedMaterials) material.dispose(); };
  }, [scene, maxAniso]);
  const stationaryAnimations = useMemo(() => animations.map(plantedPresentationClip), [animations]);
  const { actions, mixer } = useAnimations(stationaryAnimations, group);
  const w = useRef(0);
  const waveTime = useRef(0);
  const speakUntil = useRef(0);
  const poseLayer = useMemo(() => new PoseLayer(), []);
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __zoordScene?: THREE.Object3D }).__zoordScene = scene;
  }, [scene]);
  const restWeight = useRef(1);
  const waving = anim === "Wave_One_Hand";
  // Speaking uses both hands (open-palm, maître-style); at rest he keeps the relaxed pose.
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const manualPresenting = anim === "welcome";
  // Use this avatar's calm conversation clips; greetings remain bounded procedural waves.
  const clipName = (point !== null || speaking || manualPresenting) ? "Stand_and_Chat" : "Hand_on_Hip_Gesture";
  const headMotion = useMemo(() => ({ last: new THREE.Quaternion(), next: new THREE.Quaternion(), inverse: new THREE.Quaternion(), euler: new THREE.Euler(), strength: 0, lookX: 0, lookY: 0 }), []);
  useEffect(() => {
    const move = (e: PointerEvent) => setMouseGaze((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    const leave = () => setMouseGaze(0, 0);
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    return () => { window.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); };
  }, []);
  const spineLean = useMemo(() => ({ last: new THREE.Quaternion(), next: new THREE.Quaternion(), inverse: new THREE.Quaternion(), euler: new THREE.Euler() }), []);
  useFrame((_, rawDelta) => {
    poseLayer.restore();
    const head = bones.get("Head");
    if (!head) return;
    const dt = motionStep(rawDelta);
    motionTime.current += dt;
    const time = motionTime.current;
    // Gesture with the supplied talking clip while Zoord's voice is audible; hold briefly across syllable gaps.
    if (voiceLevel.v > 0.05) speakUntil.current = time + HOST_MOTION.speechHold;
    const talking = time < speakUntil.current;
    if (talking !== speakingRef.current) { speakingRef.current = talking; setSpeaking(talking); }
    // Lower-body animation tracks are excluded: feet and hips retain the supplied standing pose.
    const active = actions[clipName];
    if (active) active.paused = !talking && !manualPresenting;
    // While the radio plays, the dance owns the arms — the relaxed pose would otherwise pin them down.
    restWeight.current = THREE.MathUtils.damp(restWeight.current, !talking && point === null && !waving && !manualPresenting && !musicLevel.playing ? 1 : 0, 5, dt);
    // Relax both arms beside the torso instead of freezing midway through a talking gesture.
    for (const side of ["Right", "Left"]) {
      const arm = bones.get(`${side}Arm`);
      const fore = bones.get(`${side}ForeArm`);
      const hand = bones.get(`${side}Hand`);
      if (!arm || !fore || !hand || restWeight.current < 0.001) continue;
      arm.updateWorldMatrix(true, true);
      const shoulder = arm.getWorldPosition(new THREE.Vector3());
      const sign = side === "Right" ? -1 : 1;
      const scale = arm.getWorldScale(new THREE.Vector3()).length() / Math.sqrt(3);
      const upper = fore.position.length() * scale;
      const lower = hand.position.length() * scale;
      const elbow = shoulder.clone().add(new THREE.Vector3(sign * upper * 0.28, -upper * 0.95, 0.04));
      const palm = elbow.clone().add(new THREE.Vector3(sign * lower * 0.12, -lower * 0.96, lower * 0.20));
      poseLayer.apply(arm, () => aimLimb(arm, fore, elbow, restWeight.current));
      poseLayer.apply(fore, () => aimLimb(fore, hand, palm, restWeight.current));
    }
    // Undo our previous offset only when the mixer has not replaced the bone pose.
    if (head.quaternion.angleTo(headMotion.last) < 0.00001) head.quaternion.multiply(headMotion.inverse).normalize();
    const presenting = point !== null && anim !== "Wave_One_Hand";
    headMotion.strength = THREE.MathUtils.damp(headMotion.strength, reduced.current ? 0 : listening || presenting || talking ? 1 : 0, 5, dt);
    const side = presenting ? (panelPos(point).x < 0 ? -1 : 1) : 0;
    // Follow the customer: mouse on screen, or their movement on camera; presenting turns the gaze toward the panel.
    const follow = presenting ? 0.35 : 1;
    headMotion.lookX = THREE.MathUtils.damp(headMotion.lookX, gaze.x * follow * (reduced.current ? 0.25 : 1), 4, dt);
    headMotion.lookY = THREE.MathUtils.damp(headMotion.lookY, gaze.y * follow * (reduced.current ? 0.25 : 1), 4, dt);
    headMotion.euler.set(
      Math.sin(time * 2.4) * 0.025 * headMotion.strength - headMotion.lookY * 0.22 + (anim === "nod" ? Math.sin(time * 4) * (reduced.current ? 0.025 : 0.10) : 0),
      (side * 0.10 + Math.sin(time * 0.9) * 0.025) * headMotion.strength + headMotion.lookX * 0.5,
      -headMotion.lookX * 0.06 + (speakingRef.current ? Math.sin(time * 0.7) * 0.04 * headMotion.strength : 0),
    );
    // Euler is authored in world axes (Y = turn, X = nod); express it in the head's local frame.
    headMotion.next.setFromEuler(headMotion.euler);
    head.parent?.updateWorldMatrix(true, false);
    const headWorld = (head.parent ? head.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion()).multiply(head.quaternion);
    headMotion.next.premultiply(headWorld.clone().invert()).multiply(headWorld);
    head.quaternion.multiply(headMotion.next.normalize()).normalize();
    headMotion.last.copy(head.quaternion);
    headMotion.inverse.copy(headMotion.next).invert();
    const spine = bones.get("Spine2");
    const breathing = hostBreathing(time, reduced.current, listening || presenting || waving || manualPresenting || musicLevel.playing);
    if (spine) poseLayer.apply(spine, () => spine.quaternion.multiply(breath.quaternion.setFromEuler(breath.euler.set(breathing.pitch, 0, breathing.roll))));
    if (import.meta.env.DEV) {
      const canvas = document.querySelector(".stage-scene canvas");
      if (canvas && !canvas.hasAttribute("data-scene-ready")) canvas.setAttribute("data-scene-ready", "true");
    }
  });
  // Preserve the supplied wave and add a bounded outward reach for a readable greeting.
  useFrame((_, rawDelta) => {
    if (!waving) return;
    waveTime.current += motionStep(rawDelta);
    const t = waveTime.current;
    if (t >= 3.2) { onWaveEnd(); return; }
    const arm = bones.get("RightArm");
    const fore = bones.get("RightForeArm");
    const hand = bones.get("RightHand");
    if (!arm || !fore || !hand) return;
    arm.updateWorldMatrix(true, false);
    const shoulder = arm.getWorldPosition(new THREE.Vector3());
    const weight = THREE.MathUtils.smoothstep(t, 0, 0.5) * (1 - THREE.MathUtils.smoothstep(t, 2.6, 3.2));
    const scale = arm.getWorldScale(new THREE.Vector3()).length() / Math.sqrt(3);
    const upper = fore.position.length() * scale;
    const lower = hand.position.length() * scale;
    const elbow = shoulder.clone().add(new THREE.Vector3(-upper * 0.85, -upper * 0.2, upper * 0.35));
    const palm = elbow.clone().add(new THREE.Vector3(Math.sin(t * 6.5) * lower * (reduced.current ? 0.03 : 0.18), lower * 0.8, lower * 0.35));
    poseLayer.apply(arm, () => aimLimb(arm, fore, elbow, weight));
    poseLayer.apply(fore, () => aimLimb(fore, hand, palm, weight));
  });
  // Audio-reactive upper-body rhythm; planted legs never inherit dance/root tracks.
  useFrame((_, delta) => {
    const target = hostDanceTarget(speakingRef.current, listening, point !== null, waving || manualPresenting || anim === "nod", reduced.current);
    danceWeight.current = smoothMotion(danceWeight.current, musicLevel.playing ? musicLevel.energy * target : 0, delta);
    if (target === 0) return;
    const energy = danceWeight.current;
    if (energy < 0.01) return;
    const pulse = musicLevel.pulse;
    const rhythm = danceMotion(musicLevel.genre, motionTime.current, energy, pulse, 1);
    const spine = bones.get("Spine2");
    if (spine) poseLayer.apply(spine, () => spine.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rhythm.nod, 0, rhythm.roll))));
    for (const side of ["Right", "Left"]) {
      const arm = bones.get(`${side}Arm`);
      const fore = bones.get(`${side}ForeArm`);
      const hand = bones.get(`${side}Hand`);
      if (!arm || !fore || !hand) continue;
      arm.updateWorldMatrix(true, true);
      const shoulder = arm.getWorldPosition(new THREE.Vector3());
      const scale = arm.getWorldScale(new THREE.Vector3()).length() / Math.sqrt(3);
      const upper = fore.position.length() * scale, lower = hand.position.length() * scale;
      const sign = side === "Right" ? -1 : 1;
      const motion = danceMotion(musicLevel.genre, motionTime.current, energy, pulse, sign);
      const elbow = shoulder.clone().add(new THREE.Vector3(sign * upper * motion.reach, -upper * 0.82, upper * 0.15));
      const palm = elbow.clone().add(new THREE.Vector3(sign * lower * 0.28, -lower * 0.65 + motion.lift * lower, lower * motion.forward));
      poseLayer.apply(arm, () => aimLimb(arm, fore, elbow, motion.weight));
      poseLayer.apply(fore, () => aimLimb(fore, hand, palm, motion.weight));
    }
  });
  // Procedural pointing gesture, layered on top of the playing animation
  useFrame((_, d) => {
    w.current = THREE.MathUtils.damp(w.current, point === null || anim === "Wave_One_Hand" ? 0 : 1, 4, Math.min(d, 0.05));
    if (w.current < 0.001) return;
    const target = panelPos(point ?? 0);
    const side = target.x < 0 ? "Right" : "Left";
    const arm = bones.get(`${side}Arm`);
    const fore = bones.get(`${side}ForeArm`);
    const hand = bones.get(`${side}Hand`);
    if (!arm?.parent || !fore || !hand) return;
    arm.updateWorldMatrix(true, false);
    const shoulder = arm.getWorldPosition(new THREE.Vector3());
    const scale = arm.getWorldScale(new THREE.Vector3()).length() / Math.sqrt(3);
    const reach = (fore.position.length() + hand.position.length()) * scale;
    // Present outward at chest height, never reach up toward the face or behind the body.
    target.y = THREE.MathUtils.clamp(target.y, shoulder.y - 0.45, shoulder.y + 0.12);
    target.z = shoulder.z + 0.65;
    target.x = shoulder.x + (target.x < shoulder.x ? -1 : 1) * reach * 0.72;
    target.sub(shoulder).clampLength(0, reach * 0.88).add(shoulder);
    // A lowered elbow and bent forearm read as an invitation, not a rigid T-pose.
    const elbowTarget = shoulder.clone().lerp(target, 0.5);
    elbowTarget.y = shoulder.y - 0.35;
    elbowTarget.z = shoulder.z + 0.18;
    poseLayer.apply(arm, () => aimLimb(arm, fore, elbowTarget, w.current));
    poseLayer.apply(fore, () => aimLimb(fore, hand, target, w.current));
    poseLayer.apply(hand, () => hand.quaternion.slerp(_id, w.current * 0.2));
    // Human touch: lean the chest slightly toward the panel while presenting.
    const spine = bones.get("Spine2");
    if (spine) {
      const lean = (target.x < 0 ? -1 : 1) * 0.06 * w.current;
      spineLean.next.setFromEuler(spineLean.euler.set(0, lean, lean * 0.4));
      poseLayer.apply(spine, () => spine.quaternion.multiply(spineLean.next));
    }
  });
  // Posture guard (runs last): the torso and head may never drift far from the supplied rest pose,
  // so live speech + gestures can't twist Zoord's back toward the camera or fold him forward.
  const restPose = useMemo(() => {
    const m = new Map<THREE.Object3D, { q: THREE.Quaternion; max: number }>();
    for (const [n, max] of [["Hips", 0.35], ["Spine", 0.3], ["Spine1", 0.3], ["Spine2", 0.3], ["Neck", 0.45], ["Head", 0.7]] as const) {
      const b = scene.getObjectByName(`mixamorig:${n}`) ?? scene.getObjectByName(`mixamorig${n}`);
      if (b) m.set(b, { q: b.quaternion.clone(), max });
    }
    return m;
  }, [scene]);
  useFrame(() => {
    for (const [bone, { q, max }] of restPose) {
      const a = bone.quaternion.angleTo(q);
      if (a > max) bone.quaternion.rotateTowards(q, a - max);
    }
  });
  useEffect(() => {
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    if (import.meta.env.DEV) (window as unknown as { __zoordScene?: THREE.Object3D }).__zoordScene = scene;
  }, [scene]);
  useEffect(() => { waveTime.current = 0; }, [waveId]);
  useEffect(() => {
    const a = actions[clipName];
    if (!a || previousAction.current === a) return;
    const outgoing = previousAction.current;
    a.setLoop(THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = false;
    a.enabled = true;
    a.paused = false;
    a.reset().setEffectiveWeight(1).setEffectiveTimeScale(HOST_MOTION.clipSpeed).play();
    if (outgoing) {
      outgoing.paused = false;
      a.crossFadeFrom(outgoing, HOST_MOTION.transition, false);
    } else a.fadeIn(HOST_MOTION.transition);
    previousAction.current = a;
  }, [clipName, actions]);
  return (
    <>
      <group ref={group} position={[0, 0.3, 0]} scale={3.49 / 1.7}>
        <primitive object={scene} />
      </group>
      <ZoordMouth scene={scene} position={[-0.0163, 0.014, 0.1195]} rotationX={0} scale={0.009} />
    </>
  );
}

function Logo() {
  const tex = useTexture(dakkaiLogo);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => ref.current && (ref.current.rotation.z = clock.elapsedTime * 0.15));
  return (
    <group name="DakkaiFloatingLogo" position={[-3.2, 6.2, -12.5]} scale={0.65}>
      <mesh position-z={-0.1}>
        <circleGeometry args={[2.34, 96]} />
        <meshBasicMaterial color={stageColors.backing} transparent opacity={0.88} />
      </mesh>
      <mesh ref={ref} position-z={-0.05}>
        <ringGeometry args={[2.35, 2.42, 128]} />
        <meshBasicMaterial color={stageColors.red} toneMapped={false} transparent opacity={0.8} />
      </mesh>
      <mesh>
        <planeGeometry args={[6.4, 4.67]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

const BRAIN_POS = new THREE.Vector3(0, 5.8, 0);
// "Cérebro" DAKKAI IA: neural sphere pulsing in red + cyan
function Brain({ active }: { active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const { geo, pts } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 140; i++) {
      const v = new THREE.Vector3().randomDirection();
      v.x = v.x * 1.25 + Math.sign(v.x || 1) * 0.12; // two hemispheres
      v.y *= 0.85;
      pts.push(v.multiplyScalar(1.1 + Math.random() * 0.35));
    }
    const seg: number[] = [];
    pts.forEach((a, i) => pts.forEach((b, j) => j > i && a.distanceTo(b) < 0.75 && seg.push(a.x, a.y, a.z, b.x, b.y, b.z)));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
    const p = new THREE.BufferGeometry().setFromPoints(pts);
    p.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(pts.length * 3), 3));
    return { geo: g, pts: p };
  }, []);
  useFrame(({ clock }, d) => {
    if (ref.current) ref.current.rotation.y += d * (active ? 0.6 : 0.12);
    const col = pts.getAttribute("color") as THREE.BufferAttribute;
    const t = clock.elapsedTime * (active ? 6 : 2);
    for (let i = 0; i < col.count; i++) {
      const k = 0.35 + 0.65 * Math.max(0, Math.sin(t + i * 1.7));
      i % 3 ? col.setXYZ(i, 0.25 * k, 0.88 * k, k) : col.setXYZ(i, k, 0.1 * k, 0.15 * k);
    }
    col.needsUpdate = true;
    if (core.current) core.current.scale.setScalar((active ? 0.6 : 0.45) + Math.sin(clock.elapsedTime * (active ? 9 : 2)) * (active ? 0.12 : 0.05));
  });
  return (
    <group name="ZoordBrain" position={BRAIN_POS.toArray()} scale={0.45}>
      <group ref={ref}>
        <lineSegments geometry={geo}>
          <lineBasicMaterial color={stageColors.cyan} transparent opacity={0.45} toneMapped={false} />
        </lineSegments>
        <points geometry={pts}>
          <pointsMaterial vertexColors size={0.13} toneMapped={false} />
        </points>
      </group>
      <mesh ref={core}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={stageColors.red} transparent opacity={0.35} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Neural beam: brain -> menu panel the Zoord is pointing at
function Beam({ point }: { point: number | null }) {
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: stageColors.red, transparent: true, toneMapped: false }), []);
  const obj = useMemo(() => new THREE.Line(geo, mat), [geo, mat]);
  useEffect(() => {
    if (point === null) return;
    const end = panelPos(point);
    const start = BRAIN_POS.clone();
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 1.5, 0));
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    geo.setFromPoints(curve.getPoints(40));
  }, [point, geo]);
  useFrame(({ clock }) => {
    mat.opacity = 0.55 + Math.sin(clock.elapsedTime * 10) * 0.35;
  });
  if (point === null) return null;
  return <primitive object={obj} />;
}

function StageCamera() {
  const { camera, size, setDpr } = useThree();
  useEffect(() => {
    setDpr(Math.min(2, window.devicePixelRatio || 1, 3840 / Math.max(size.width, 1)));
    const aspect = size.width / Math.max(size.height, 1);
    const distance = Math.max(10.5, 4.6 / (Math.tan(THREE.MathUtils.degToRad(20)) * aspect));
    camera.position.set(0, 3.1, distance);
    camera.lookAt(0, 2.45, 0);
  }, [camera, size.width, size.height, setDpr]);
  return null;
}

export function Stage() {
  const [colorsReady, setColorsReady] = useState(false);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    stageColors.cyan = css.getPropertyValue("--stage-led-cyan").trim();
    stageColors.blue = css.getPropertyValue("--stage-led-blue").trim();
    stageColors.red = css.getPropertyValue("--stage-led-red").trim();
    stageColors.space = css.getPropertyValue("--stage-space").trim();
    stageColors.backing = css.getPropertyValue("--stage-logo-backing").trim();
    setColorsReady(true);
  }, []);
  const [anim, setAnim] = useState("Idle_12");
  const [open, setOpen] = useState<number | null>(null);
  const [aiPoint, setAiPoint] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [waveId, setWaveId] = useState(0);
  const wave = useCallback(() => { setAiPoint(null); setAnim("Wave_One_Hand"); setWaveId((id) => id + 1); }, []);
  const endWave = useCallback(() => setAnim((current) => current === "Wave_One_Hand" ? "Idle_12" : current), []);
  const shown = aiPoint ?? open;
  const voiceCommands = useRef<LiveZoordCommands | null>(null);
  const [controlPanel, setControlPanel] = useState<"music" | "gestures" | null>(null);
  const gestureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (gestureTimer.current) clearTimeout(gestureTimer.current); }, []);
  const performGesture = (gesture: StageGesture) => {
    if (gestureTimer.current) clearTimeout(gestureTimer.current);
    setAiPoint(null);
    if (gesture === "wave") { setOpen(null); wave(); return; }
    if (gesture === "point") { setOpen(open ?? 0); setAiPoint(open ?? 0); setAnim("Idle_12"); return; }
    setOpen(null);
    setAnim(gesture === "rest" ? "Idle_12" : gesture);
    if (gesture !== "rest") gestureTimer.current = setTimeout(() => setAnim("Idle_12"), 3200);
  };
  const [ticket, setTicket] = useState<TicketState | null>(null);
  const placeOrder = useCallback(async (order: NewOrder) => {
    setTicket({ order, status: "sending" });
    const { error } = await supabase.from("orders").insert({
      customer_name: order.customer_name, table_number: order.table_number, notes: order.notes,
      items: order.items, total: order.total,
    });
    setTicket({ order, status: error ? "failed" : "sent" });
  }, []);
  const pointToMenu = useCallback((i: number | null) => {
    setAiPoint(i);
    if (i !== null && MENU[i]) setOpen(i);
  }, []);
  const openMenu = (i: number) => {
    setOpen(i);
    setAnim("Idle_12");
    voiceCommands.current?.present(i);
  };
  return (
    <div className="fixed inset-0 bg-background">
      <div className={`stage-scene ${open !== null ? "stage-scene-menu" : ""}`}>
      {colorsReady && <Canvas shadows="percentage" dpr={[1, 2]} camera={{ position: [0, 3.1, 8.5], fov: 40 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08 }}>
        <StageCamera />
        <color attach="background" args={[stageColors.space]} />
        <Suspense fallback={null}><UniverseBackdrop /></Suspense>
        <fog attach="fog" args={[stageColors.space, 28, 65]} />
        <ambientLight intensity={0.35} color={stageColors.cyan} />
        <pointLight position={[-4, 3, 2]} intensity={24} color={stageColors.cyan} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0002} shadow-normalBias={0.03} />
        <pointLight position={[4, 2, 2]} intensity={20} color={stageColors.blue} />
        <pointLight position={[2.5, 4.5, -2]} intensity={32} color={stageColors.red} distance={9} decay={2} />
        <Environment resolution={256}>
          <Lightformer intensity={1.6} color={stageColors.cyan} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
          <Lightformer intensity={1.3} color={stageColors.cyan} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 0.5, 1]} />
          <Lightformer intensity={1.3} color={stageColors.blue} position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[20, 0.5, 1]} />
          <Lightformer intensity={0.8} color={stageColors.red} position={[0, 4, -5]} scale={[6, 2, 1]} />
        </Environment>

        <Suspense fallback={null}>
          <DakkaiRestaurant />
          <CounterVitrine />
        </Suspense>
        <pointLight position={[-8, 7, -10]} intensity={95} color={stageColors.cyan} distance={30} decay={1.5} />
        <pointLight position={[8, 6, -14]} intensity={85} color={stageColors.blue} distance={30} decay={1.5} />
        <pointLight position={[0, 4, -8]} intensity={26} color={stageColors.red} distance={12} />
        <Suspense fallback={null}>
          <Logo />
        </Suspense>
        <Brain active={shown !== null} />
        <Beam point={shown} />

        <Suspense fallback={null}>
          <Robot anim={anim} point={shown} listening={listening} waveId={waveId} onWaveEnd={endWave} />
        </Suspense>

        <OrbitControls target={[0, 2.45, 0]} enablePan={false} minDistance={7} maxDistance={28} minAzimuthAngle={-0.25} maxAzimuthAngle={0.25} minPolarAngle={1.25} maxPolarAngle={1.55} enableDamping />
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.16} luminanceThreshold={1.1} mipmapBlur />
          <Vignette darkness={0.22} offset={0.35} />
        </EffectComposer>
      </Canvas>}
      </div>

      {ticket && <OrderTicket ticket={ticket} onClose={() => setTicket(null)} />}
      <div className="stage-overlay pointer-events-none fixed inset-0 flex flex-col justify-between p-4 md:p-6">
        <header className="stage-header flex items-center justify-between gap-3">
          <span className="flex items-center gap-3">
            <span className="font-display text-sm tracking-[0.5em] text-foreground">DAKKAI <span className="text-dakkai">×</span> ZOORD</span>
            <SecurityBadge />
          </span>
          <div className="pointer-events-auto flex items-center gap-3">
            <UserAccount />
            <Button variant="ghost" onClick={() => setOpen(0)} className="stage-chip"><UtensilsCrossed />Cardápio</Button>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="stage-chip stage-chip-red">Pedir no WhatsApp</a>
          </div>
        </header>
        <div className="stage-controls">
          <div className="mb-3 flex justify-center">
            <LiveZoord ref={voiceCommands} onPoint={pointToMenu} onGreeting={wave} onListening={setListening} onOrder={placeOrder} />
          </div>
          <nav className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
            <RadioPlayer hidden={controlPanel === "gestures"} listening={listening} onOpen={() => setControlPanel("music")} onSpeak={(text) => voiceCommands.current?.say(text)} />
            <RecordRepeat />
            <GesturePanel hidden={controlPanel === "music"} onOpen={() => setControlPanel("gestures")} onGesture={performGesture} />
            <Button variant="ghost" onClick={() => { setAnim("Idle_12"); voiceCommands.current?.present(null); }} className="stage-chip"><UtensilsCrossed />Apresentar cardápio</Button>
            <Button variant="ghost" onClick={() => { setAiPoint(null); setAnim("Idle_12"); }} className="stage-chip" aria-label="Voltar à postura inicial" title="Postura inicial"><RotateCcw /></Button>
          </nav>
        </div>
      </div>

      {open !== null && (
        <aside aria-label="Cardápio Dakkai" className="zoord-side-menu fixed z-50" >
          <div className="menu-sheet !max-h-full !rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <img src={dakkaiLogo} alt="DAKKAI Sushi" className="h-16 w-auto" />
              <Button variant="ghost" onClick={() => setOpen(null)} className="stage-chip" aria-label="Fechar"><X /></Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {MENU.map((s, i) => (
                <Button variant="ghost" key={s.t} onClick={() => openMenu(i)} className={`stage-chip ${open === i ? "stage-chip-active" : ""}`}>{s.t}</Button>
              ))}
            </div>
            <h2 className="mt-6 font-display text-2xl text-foreground">{MENU[open]?.t}</h2>
            <ul className="mt-4 space-y-3">
              {MENU[open]?.items.map((it) => (
                <li key={it.n} className="flex items-start justify-between gap-4 border-b border-border pb-3">
                  <div>
                    <p className="font-semibold text-foreground">{it.n}</p>
                  </div>
                  <span className="whitespace-nowrap font-display text-dakkai">{it.p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={WHATSAPP} target="_blank" rel="noreferrer" className="stage-chip stage-chip-red">Pedir no WhatsApp</a>
              <a href={ORDER_URL} target="_blank" rel="noreferrer" className="stage-chip">Cardápio digital ↗</a>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

