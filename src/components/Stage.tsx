import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  useAnimations,
  MeshReflectorMaterial,
  Environment,
  Lightformer,
  Sparkles,
  useTexture,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { gaze, setMouseGaze } from "@/lib/gaze";
import zoord from "@/assets/zoord-cyber-hero.glb.asset.json";
import dakkaiLogo from "@/assets/dakkai-logo.png";
import { LiveZoord, type LiveZoordCommands } from "./LiveZoord";
import { voiceLevel } from "@/lib/voice-level";
import { ZoordMouth } from "./ZoordMouth";
import { RecordRepeat } from "./RecordRepeat";
import { Button } from "@/components/ui/button";
import { OrderTicket, type TicketState } from "./OrderTicket";
import { supabase } from "@/integrations/supabase/client";
import type { NewOrder } from "@/lib/orders";
import { MENU, WHATSAPP, ORDER_URL } from "./menu";
import { aimLimb } from "@/lib/zoord-gesture";
import { PoseLayer } from "@/lib/zoord-pose";
import { Hand, UtensilsCrossed, X, RotateCcw } from "lucide-react";

const CYAN = "#3fe0ff";
const BLUE = "#2f7bff";
const RED = "#c4141f";

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
  const { scene, animations } = useGLTF(zoord.url);
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  // Sharper face: full anisotropic filtering on the avatar's textures, viewed at a glancing angle.
  useEffect(() => {
    scene.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!mat || Array.isArray(mat)) return;
      for (const tex of [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap]) {
        if (tex) { tex.anisotropy = maxAniso; tex.needsUpdate = true; }
      }
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
    });
  }, [scene, maxAniso]);
  const { actions, mixer } = useAnimations(animations, group);
  const w = useRef(0);
  const waveTime = useRef(0);
  const speakUntil = useRef(0);
  const poseLayer = useMemo(() => new PoseLayer(), []);
  const restWeight = useRef(1);
  const waving = anim === "Wave_One_Hand";
  // Speaking uses both hands (open-palm, maître-style); at rest he keeps the relaxed pose.
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const legWeight = useRef(0);
  const clipName = (point !== null || speaking) && !waving ? "Talk_with_Hands_Open" : "Talk_with_Left_Hand_on_Hip";
  const headMotion = useMemo(() => ({ last: new THREE.Quaternion(), next: new THREE.Quaternion(), inverse: new THREE.Quaternion(), euler: new THREE.Euler(), strength: 0, lookX: 0, lookY: 0 }), []);
  useEffect(() => {
    const move = (e: PointerEvent) => setMouseGaze((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    const leave = () => setMouseGaze(0, 0);
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    return () => { window.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); };
  }, []);
  const spineLean = useMemo(() => ({ last: new THREE.Quaternion(), next: new THREE.Quaternion(), inverse: new THREE.Quaternion(), euler: new THREE.Euler() }), []);
  useFrame(({ clock }, rawDelta) => {
    poseLayer.restore();
    const head = scene.getObjectByName("mixamorig:Head") ?? scene.getObjectByName("mixamorigHead");
    if (!head) return;
    const dt = Math.min(rawDelta, 0.05);
    // Gesture with the supplied talking clip while Zoord's voice is audible; hold briefly across syllable gaps.
    if (voiceLevel.v > 0.05) speakUntil.current = clock.elapsedTime + 0.8;
    const talking = clock.elapsedTime < speakUntil.current;
    if (talking !== speakingRef.current) { speakingRef.current = talking; setSpeaking(talking); }
    // Feet stay planted. Only while explaining the menu does the body shift weight: the torso turns toward
    // the panel and one knee softens, so the legs follow the upper body like a person presenting.
    legWeight.current = THREE.MathUtils.damp(legWeight.current, point !== null && !waving ? 1 : 0, 2.5, dt);
    if (legWeight.current > 0.001) {
      const bone = (n: string) => scene.getObjectByName(`mixamorig:${n}`) ?? scene.getObjectByName(`mixamorig${n}`);
      const toward = point !== null && panelPos(point).x < 0 ? -1 : 1;
      const breathe = Math.sin(clock.elapsedTime * 0.6) * 0.3;
      const shift = legWeight.current * (0.7 + breathe * 0.3);
      const spine = bone("Spine");
      if (spine) poseLayer.apply(spine, () => spine.quaternion.multiply(_q.setFromEuler(_e.set(0, toward * 0.08 * shift, -toward * 0.025 * shift))));
      // Soften the knee on the side away from the panel; thigh and shin bends cancel so the foot stays put.
      const side = toward > 0 ? "Left" : "Right";
      const bend = 0.09 * shift;
      const up = bone(`${side}UpLeg`), leg = bone(`${side}Leg`), foot = bone(`${side}Foot`);
      if (up) poseLayer.apply(up, () => up.quaternion.multiply(_q.setFromEuler(_e.set(-bend, 0, 0))));
      if (leg) poseLayer.apply(leg, () => leg.quaternion.multiply(_q.setFromEuler(_e.set(bend * 2, 0, 0))));
      if (foot) poseLayer.apply(foot, () => foot.quaternion.multiply(_q.setFromEuler(_e.set(-bend, 0, 0))));
    }
    const active = actions[clipName];
    if (active) active.paused = !talking;
    restWeight.current = THREE.MathUtils.damp(restWeight.current, !talking && point === null && !waving ? 1 : 0, 5, dt);
    // Relax both arms beside the torso instead of freezing midway through a talking gesture.
    for (const side of ["Right", "Left"]) {
      const arm = scene.getObjectByName(`mixamorig:${side}Arm`) ?? scene.getObjectByName(`mixamorig${side}Arm`);
      const fore = scene.getObjectByName(`mixamorig:${side}ForeArm`) ?? scene.getObjectByName(`mixamorig${side}ForeArm`);
      const hand = scene.getObjectByName(`mixamorig:${side}Hand`) ?? scene.getObjectByName(`mixamorig${side}Hand`);
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
    headMotion.strength = THREE.MathUtils.damp(headMotion.strength, listening || presenting || clock.elapsedTime < speakUntil.current ? 1 : 0, 5, dt);
    const side = presenting ? (panelPos(point).x < 0 ? -1 : 1) : 0;
    // Follow the customer: mouse on screen, or their movement on camera; presenting turns the gaze toward the panel.
    const follow = presenting ? 0.35 : 1;
    headMotion.lookX = THREE.MathUtils.damp(headMotion.lookX, gaze.x * follow, 4, dt);
    headMotion.lookY = THREE.MathUtils.damp(headMotion.lookY, gaze.y * follow, 4, dt);
    headMotion.euler.set(
      Math.sin(clock.elapsedTime * 2.4) * 0.025 * headMotion.strength - headMotion.lookY * 0.22,
      (side * 0.10 + Math.sin(clock.elapsedTime * 0.9) * 0.025) * headMotion.strength + headMotion.lookX * 0.5,
      -headMotion.lookX * 0.06 + (speakingRef.current ? Math.sin(clock.elapsedTime * 0.7) * 0.04 * headMotion.strength : 0), // gentle courteous head tilt while speaking
    );
    // Euler is authored in world axes (Y = turn, X = nod); express it in the head's local frame.
    headMotion.next.setFromEuler(headMotion.euler);
    head.parent?.updateWorldMatrix(true, false);
    const headWorld = (head.parent ? head.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion()).multiply(head.quaternion);
    headMotion.next.premultiply(headWorld.clone().invert()).multiply(headWorld);
    head.quaternion.multiply(headMotion.next.normalize()).normalize();
    headMotion.last.copy(head.quaternion);
    headMotion.inverse.copy(headMotion.next).invert();
  });
  // The supplied avatar has conversation clips but no wave clip: layer a single outward wave.
  useFrame((_, rawDelta) => {
    if (!waving) return;
    waveTime.current += Math.min(rawDelta, 0.05);
    const t = waveTime.current;
    if (t >= 3.2) { onWaveEnd(); return; }
    const arm = scene.getObjectByName("mixamorig:RightArm") ?? scene.getObjectByName("mixamorigRightArm");
    const fore = scene.getObjectByName("mixamorig:RightForeArm") ?? scene.getObjectByName("mixamorigRightForeArm");
    const hand = scene.getObjectByName("mixamorig:RightHand") ?? scene.getObjectByName("mixamorigRightHand");
    if (!arm || !fore || !hand) return;
    arm.updateWorldMatrix(true, false);
    const shoulder = arm.getWorldPosition(new THREE.Vector3());
    const weight = THREE.MathUtils.smoothstep(t, 0, 0.5) * (1 - THREE.MathUtils.smoothstep(t, 2.6, 3.2));
    const elbow = shoulder.clone().add(new THREE.Vector3(-0.48, -0.12, 0.3));
    const palm = shoulder.clone().add(new THREE.Vector3(-0.72 + Math.sin(t * 8) * 0.12, 0.55, 0.45));
    poseLayer.apply(arm, () => aimLimb(arm, fore, elbow, weight));
    poseLayer.apply(fore, () => aimLimb(fore, hand, palm, weight));
  });
  // Procedural pointing gesture, layered on top of the playing animation
  useFrame((_, d) => {
    w.current = THREE.MathUtils.damp(w.current, point === null || anim === "Wave_One_Hand" ? 0 : 1, 4, Math.min(d, 0.05));
    if (w.current < 0.001) return;
    const target = panelPos(point ?? 0);
    const side = target.x < 0 ? "Right" : "Left";
    const arm = scene.getObjectByName(`mixamorig:${side}Arm`) ?? scene.getObjectByName(`mixamorig${side}Arm`);
    const fore = scene.getObjectByName(`mixamorig:${side}ForeArm`) ?? scene.getObjectByName(`mixamorig${side}ForeArm`);
    const hand = scene.getObjectByName(`mixamorig:${side}Hand`) ?? scene.getObjectByName(`mixamorig${side}Hand`);
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
    const spine = scene.getObjectByName("mixamorig:Spine2") ?? scene.getObjectByName("mixamorigSpine2");
    if (spine) {
      const lean = (target.x < 0 ? -1 : 1) * 0.06 * w.current;
      spineLean.next.setFromEuler(spineLean.euler.set(0, lean, lean * 0.4));
      poseLayer.apply(spine, () => spine.quaternion.multiply(spineLean.next));
    }
  });
  useEffect(() => {
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }, [scene]);
  useEffect(() => {
    waveTime.current = 0;
    const a = actions[clipName];
    if (a) {
      a.setLoop(THREE.LoopRepeat, Infinity);
      a.clampWhenFinished = false;
      a.paused = false;
      a.reset().fadeIn(0.4).play();
      a.setEffectiveTimeScale(0.72); // unhurried, refined gestures
      // Keep the relaxed supplied pose at rest; use the full open-hand clip when presenting.
      if (clipName === "Talk_with_Left_Hand_on_Hip") a.paused = true;
    }
    return () => {
      if (a) a.paused = false;
      a?.fadeOut(0.4);
    };
  }, [clipName, actions, mixer, waveId, waving]);
  return (
    <group ref={group} position={[0, 0.3, 0]} scale={2.3}>
      <primitive object={scene} />
      <ZoordMouth scene={scene} position={[0, 5.4, 10.9]} rotationX={-0.78} />
    </group>
  );
}

function Ring({ r, y = 0.31, w = 0.03, color = CYAN, speed = 0 }: { r: number; y?: number; w?: number; color?: string; speed?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, d) => ref.current && (ref.current.rotation.z += d * speed));
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position-y={y}>
      <ringGeometry args={[r, r + w, 128]} />
      <meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Platform() {
  return (
    <group>
      <mesh position-y={0.15} receiveShadow castShadow>
        <cylinderGeometry args={[2.6, 2.8, 0.3, 6]} />
        <meshStandardMaterial color="#0b0e13" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position-y={0.302} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[2.3, 64]} />
        <meshStandardMaterial color="#05070a" metalness={1} roughness={0.15} />
      </mesh>
      <Ring r={2.3} w={0.04} />
      <Ring r={1.6} w={0.012} color={BLUE} />
      {/* hex edge glow */}
      <mesh position-y={0.05}>
        <cylinderGeometry args={[2.82, 2.82, 0.03, 6, 1, true]} />
        <meshBasicMaterial color={CYAN} toneMapped={false} />
      </mesh>
      <Ring r={3.6} y={0.01} w={0.02} color={BLUE} speed={0} />
      <Ring r={5.2} y={0.01} w={0.015} color={CYAN} />
    </group>
  );
}

// Soft white/grey mottled texture (procedural, no extra download).
function makeMarble() {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#e9edf1"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = 6 + Math.random() * 60;
    const v = 200 + Math.floor(Math.random() * 55);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(${v},${v + 2 > 255 ? 255 : v + 2},${Math.min(255, v + 6)},0.35)`);
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function Wall() {
  const panels = useMemo(() => Array.from({ length: 15 }, (_, i) => (i - 7) * 0.17), []);
  const marble = useMemo(makeMarble, []);
  return (
    <group>
      {panels.map((a, i) => {
        const R = 12;
        const x = Math.sin(a) * R;
        const z = -Math.cos(a) * R;
        return (
          <group key={i} position={[x, 0, z]} rotation-y={-a}>
            <mesh position-y={4}>
              <boxGeometry args={[2.15, 9, 0.15]} />
              <meshStandardMaterial map={marble} color="#ffffff" metalness={0.05} roughness={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Logo() {
  const tex = useTexture(dakkaiLogo);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => ref.current && (ref.current.rotation.z = clock.elapsedTime * 0.15));
  return (
    <group position={[0, 4.1, -9]} scale={0.7}>
      <mesh position-z={-0.1}>
        <circleGeometry args={[2.34, 96]} />
        <meshBasicMaterial color="#0b0e13" transparent opacity={0.88} />
      </mesh>
      <mesh ref={ref} position-z={-0.05}>
        <ringGeometry args={[2.35, 2.42, 128]} />
        <meshBasicMaterial color={RED} toneMapped={false} transparent opacity={0.8} />
      </mesh>
      <mesh>
        <planeGeometry args={[6.4, 4.67]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

const BRAIN_POS = new THREE.Vector3(0, 6.55, -9.2);
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
    <group position={BRAIN_POS.toArray()} scale={0.7}>
      <group ref={ref}>
        <lineSegments geometry={geo}>
          <lineBasicMaterial color={CYAN} transparent opacity={0.45} toneMapped={false} />
        </lineSegments>
        <points geometry={pts}>
          <pointsMaterial vertexColors size={0.13} toneMapped={false} />
        </points>
      </group>
      <mesh ref={core}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={RED} transparent opacity={0.35} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Neural beam: brain -> menu panel the Zoord is pointing at
function Beam({ point }: { point: number | null }) {
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: RED, transparent: true, toneMapped: false }), []);
  const obj = useMemo(() => new THREE.Line(geo, mat), [geo, mat]);
  useFrame(({ clock }) => {
    if (point === null) return;
    const end = panelPos(point);
    const start = BRAIN_POS.clone();
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 1.5, 0));
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    geo.setFromPoints(curve.getPoints(40));
    mat.opacity = 0.55 + Math.sin(clock.elapsedTime * 10) * 0.35;
  });
  if (point === null) return null;
  return <primitive object={obj} />;
}

function StageCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.set(0, 3.1, size.width < 800 ? 10.5 : 8.5);
    camera.lookAt(0, 2.45, 0);
  }, [camera, size.width, size.height]);
  return null;
}

export function Stage() {
  const [anim, setAnim] = useState("Idle_12");
  const [open, setOpen] = useState<number | null>(null);
  const [aiPoint, setAiPoint] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [waveId, setWaveId] = useState(0);
  const wave = useCallback(() => { setAiPoint(null); setAnim("Wave_One_Hand"); setWaveId((id) => id + 1); }, []);
  const endWave = useCallback(() => setAnim((current) => current === "Wave_One_Hand" ? "Idle_12" : current), []);
  const shown = aiPoint ?? open;
  const voiceCommands = useRef<LiveZoordCommands | null>(null);
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
      <Canvas shadows="percentage" dpr={[1, 2]} camera={{ position: [0, 3.1, 8.5], fov: 40 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
        <StageCamera />
        <color attach="background" args={["#d9e0e6"]} />
        <fog attach="fog" args={["#d9e0e6", 14, 30]} />
        <ambientLight intensity={0.9} color="#cfeaff" />
        <pointLight position={[-4, 2, 2]} intensity={26} color={CYAN} castShadow shadow-mapSize={[512, 512]} />
        <pointLight position={[4, 2, 2]} intensity={26} color={BLUE} />
        <Environment resolution={256}>
          <Lightformer intensity={1.6} color={CYAN} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
          <Lightformer intensity={1.5} color={CYAN} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 0.5, 1]} />
          <Lightformer intensity={1.5} color={BLUE} position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[20, 0.5, 1]} />
        </Environment>

        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#c7ced5" roughness={0.9} metalness={0} />
        </mesh>

        <Platform />
        <Wall />
        <pointLight position={[0, 4, -8]} intensity={18} color={RED} distance={12} />
        <Suspense fallback={null}>
          <Logo />
        </Suspense>
        <Brain active={shown !== null} />
        <Beam point={shown} />
        <Sparkles count={80} scale={[14, 7, 10]} position={[0, 3.5, -2]} size={1.6} speed={0.25} color="#ff9aa0" opacity={0.5} />

        <Suspense fallback={null}>
          <Robot anim={anim} point={shown} listening={listening} waveId={waveId} onWaveEnd={endWave} />
        </Suspense>

        <OrbitControls target={[0, 2.45, 0]} enablePan={false} minDistance={7} maxDistance={16} minAzimuthAngle={-0.25} maxAzimuthAngle={0.25} minPolarAngle={1.25} maxPolarAngle={1.55} enableDamping />
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.6} luminanceThreshold={0.97} mipmapBlur />
          <Vignette darkness={0.35} offset={0.35} />
        </EffectComposer>
      </Canvas>
      </div>

      {ticket && <OrderTicket ticket={ticket} onClose={() => setTicket(null)} />}
      <div className="stage-overlay pointer-events-none fixed inset-0 flex flex-col justify-between p-4 md:p-6">
        <header className="stage-header flex items-center justify-between gap-3">
          <span className="font-display text-sm tracking-[0.5em] text-foreground">DAKKAI <span className="text-dakkai">×</span> ZOORD</span>
          <div className="pointer-events-auto flex items-center gap-3">
            <Button variant="ghost" onClick={() => setOpen(0)} className="stage-chip"><UtensilsCrossed />Cardápio</Button>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="stage-chip stage-chip-red">Pedir no WhatsApp</a>
          </div>
        </header>
        <div className="stage-controls">
          <div className="mb-3 flex justify-center">
            <LiveZoord ref={voiceCommands} onPoint={pointToMenu} onGreeting={wave} onListening={setListening} onOrder={placeOrder} />
          </div>
          <nav className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
            <RecordRepeat />
            <Button variant="ghost" onClick={wave} className="stage-chip"><Hand />Acenar</Button>
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

function Loaded({ onLoad }: { onLoad: () => void }) {
  useEffect(onLoad, [onLoad]);
  return null;
}
