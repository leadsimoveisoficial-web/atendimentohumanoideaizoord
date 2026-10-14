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
  Html,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import zoord from "@/assets/zoord.glb.asset.json";
import dakkaiLogo from "@/assets/dakkai-logo.png";
import { LiveZoord, type LiveZoordCommands } from "./LiveZoord";
import { ZoordMouth } from "./ZoordMouth";
import { Button } from "@/components/ui/button";
import { MENU, WHATSAPP, ORDER_URL } from "./menu";
import { aimLimb } from "@/lib/zoord-gesture";
import { Hand, UtensilsCrossed, X, RotateCcw } from "lucide-react";

const CYAN = "#3fe0ff";
const BLUE = "#2f7bff";
const RED = "#c4141f";

export function panelPos(i: number) {
  const half = Math.ceil(MENU.length / 2);
  const left = i < half;
  const row = left ? i : i - half;
  return new THREE.Vector3(left ? -3.5 : 3.5, 4.9 - row * 0.94, -1.2);
}

const _id = new THREE.Quaternion();

function Robot({ anim, point, listening, waveId, onWaveEnd }: { anim: string; point: number | null; listening: boolean; waveId: number; onWaveEnd: () => void }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(zoord.url);
  const { actions, mixer } = useAnimations(animations, group);
  const w = useRef(0);
  const headMotion = useMemo(() => ({ last: new THREE.Quaternion(), next: new THREE.Quaternion(), inverse: new THREE.Quaternion(), euler: new THREE.Euler(), strength: 0 }), []);
  useFrame(({ clock }, rawDelta) => {
    const head = scene.getObjectByName("mixamorig:Head") ?? scene.getObjectByName("mixamorigHead");
    if (!head) return;
    const dt = Math.min(rawDelta, 0.05);
    // Undo our previous offset only when the mixer has not replaced the bone pose.
    if (head.quaternion.angleTo(headMotion.last) < 0.00001) head.quaternion.multiply(headMotion.inverse);
    const presenting = point !== null && anim !== "Wave_One_Hand";
    headMotion.strength = THREE.MathUtils.damp(headMotion.strength, listening || presenting ? 1 : 0, 5, dt);
    const side = presenting ? (panelPos(point).x < 0 ? -1 : 1) : 0;
    headMotion.euler.set(Math.sin(clock.elapsedTime * 2.4) * 0.025 * headMotion.strength, (side * 0.10 + Math.sin(clock.elapsedTime * 0.9) * 0.025) * headMotion.strength, 0);
    headMotion.next.setFromEuler(headMotion.euler);
    head.quaternion.multiply(headMotion.next);
    headMotion.last.copy(head.quaternion);
    headMotion.inverse.copy(headMotion.next).invert();
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
    // Present outward at chest height, never reach up toward the face or behind the body.
    target.y = THREE.MathUtils.clamp(target.y, shoulder.y - 0.45, shoulder.y + 0.12);
    target.z = shoulder.z + 0.65;
    // A lowered elbow and bent forearm read as an invitation, not a rigid T-pose.
    const elbowTarget = shoulder.clone().lerp(target, 0.5);
    elbowTarget.y = shoulder.y - 0.35;
    elbowTarget.z = shoulder.z + 0.18;
    aimLimb(arm, fore, elbowTarget, w.current);
    aimLimb(fore, hand, target, w.current);
    hand.quaternion.slerp(_id, w.current * 0.35);
  });
  useEffect(() => {
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }, [scene]);
  useEffect(() => {
    const a = actions[anim];
    if (a) {
      a.setLoop(anim === "Wave_One_Hand" ? THREE.LoopOnce : THREE.LoopRepeat, anim === "Wave_One_Hand" ? 1 : Infinity);
      a.clampWhenFinished = anim === "Wave_One_Hand";
    }
    const finished = (event: { action: THREE.AnimationAction }) => { if (event.action === a && anim === "Wave_One_Hand") onWaveEnd(); };
    mixer.addEventListener("finished", finished);
    a?.reset().fadeIn(0.4).play();
    return () => {
      mixer.removeEventListener("finished", finished);
      a?.fadeOut(0.4);
    };
  }, [anim, actions, mixer, waveId, onWaveEnd]);
  return (
    <group ref={group} position={[0, 0.3, 0]} scale={2.3}>
      <primitive object={scene} />
      <ZoordMouth scene={scene} />
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

function Wall() {
  const panels = useMemo(() => Array.from({ length: 15 }, (_, i) => (i - 7) * 0.17), []);
  return (
    <group>
      {panels.map((a, i) => {
        const R = 12;
        const x = Math.sin(a) * R;
        const z = -Math.cos(a) * R;
        return (
          <group key={i} position={[x, 0, z]} rotation-y={-a}>
            <mesh position-y={4}>
              <boxGeometry args={[1.95, 8, 0.15]} />
              <meshStandardMaterial color="#0d1117" metalness={0.85} roughness={0.35} />
            </mesh>
            <mesh position={[0.99, 4, 0.09]}>
              <boxGeometry args={[0.02, 7.6, 0.02]} />
              <meshBasicMaterial color={i % 3 === 0 ? CYAN : "#5a7290"} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.06, 0.4]}>
              <boxGeometry args={[1.95, 0.03, 0.03]} />
              <meshBasicMaterial color={BLUE} toneMapped={false} />
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

// Futuristic LED menu panels: two floating columns on the sides, Zoord stays the star in the center.
// Left column gets the first half of the menu, right column the rest. Click opens the full menu.
function LedPanel({ i, x, y, phase, onOpen }: { i: number; x: number; y: number; phase: number; onOpen: (i: number) => void }) {
  const g = useRef<THREE.Group>(null);
  const led = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g.current) {
      g.current.position.y = y + Math.sin(t * 0.8 + phase) * 0.08;
      g.current.rotation.y = (x < 0 ? 0.42 : -0.42) + Math.sin(t * 0.4 + phase) * 0.03;
    }
    if (led.current) (led.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 2 + phase) * 0.25;
  });
  const s = MENU[i];
  if (!s) return null;
  const accent = i % 4 === 0 ? RED : i % 2 === 0 ? CYAN : BLUE;
  return (
    <group ref={g} position={[x, y, -1.2]}>
      {/* LED edge glow */}
      <mesh ref={led} position-z={-0.02}>
        <planeGeometry args={[0, 0]} />
        <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={0.7} />
      </mesh>
      <Html transform center distanceFactor={4.5} zIndexRange={[10, 0]} style={{ pointerEvents: "auto" }}>
        <Button variant="ghost" onClick={() => onOpen(i)} className={`menu-led ${accent === RED ? "led-red" : accent === CYAN ? "led-cyan" : "led-blue"}`}>
          <span className="menu-page-num">{String(i + 1).padStart(2, "0")} · DAKKAI</span>
          <h3>{s.t}</h3>
          <ul>
            {s.items.slice(0, 2).map((it) => (
              <li key={it.n}><span>{it.n}</span><b>{it.p}</b></li>
            ))}
          </ul>
          <em>{s.items.length} itens · toque para ver tudo</em>
        </Button>
      </Html>
    </group>
  );
}

function FlyingMenu({ onOpen }: { onOpen: (i: number) => void }) {
  const half = Math.ceil(MENU.length / 2);
  return (
    <group>
      {MENU.map((_, i) => {
        const left = i < half;
        const row = left ? i : i - half;
        const x = left ? -3.5 : 3.5;
        const y = 4.9 - row * 0.94;
        return <LedPanel key={i} i={i} x={x} y={y} phase={i * 1.3} onOpen={onOpen} />;
      })}
    </group>
  );
}

// "Cérebro" DAKKAI IA: neural sphere pulsing in red + cyan
function Brain({ active }: { active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const { geo, pts } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 70; i++) {
      const v = new THREE.Vector3().randomDirection();
      v.x *= 1.25; // brain-like ellipsoid
      pts.push(v.multiplyScalar(1.1 + Math.random() * 0.35));
    }
    const seg: number[] = [];
    pts.forEach((a, i) => pts.forEach((b, j) => j > i && a.distanceTo(b) < 0.75 && seg.push(a.x, a.y, a.z, b.x, b.y, b.z)));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
    const p = new THREE.BufferGeometry().setFromPoints(pts);
    return { geo: g, pts: p };
  }, []);
  useFrame(({ clock }, d) => {
    if (ref.current) ref.current.rotation.y += d * (active ? 0.6 : 0.12);
    if (core.current) core.current.scale.setScalar((active ? 0.6 : 0.45) + Math.sin(clock.elapsedTime * (active ? 9 : 2)) * (active ? 0.12 : 0.05));
  });
  return (
    <group position={[0, 9.6, -10]}>
      <group ref={ref}>
        <lineSegments geometry={geo}>
          <lineBasicMaterial color={CYAN} transparent opacity={0.45} toneMapped={false} />
        </lineSegments>
        <points geometry={pts}>
          <pointsMaterial color={RED} size={0.09} toneMapped={false} />
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
    const start = new THREE.Vector3(0, 9.6, -10);
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
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [aiPoint, setAiPoint] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [waveId, setWaveId] = useState(0);
  const wave = useCallback(() => { setAiPoint(null); setAnim("Wave_One_Hand"); setWaveId((id) => id + 1); }, []);
  const endWave = useCallback(() => setAnim((current) => current === "Wave_One_Hand" ? "Idle_12" : current), []);
  const shown = aiPoint ?? open;
  const voiceCommands = useRef<LiveZoordCommands | null>(null);
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
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 3.1, 8.5], fov: 40 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
        <StageCamera />
        <color attach="background" args={["#030507"]} />
        <fog attach="fog" args={["#030507", 12, 26]} />
        <ambientLight intensity={0.22} color="#8fdcff" />
        <pointLight position={[-4, 2, 2]} intensity={26} color={CYAN} castShadow shadow-mapSize={[512, 512]} />
        <pointLight position={[4, 2, 2]} intensity={26} color={BLUE} />
        <Environment resolution={256}>
          <Lightformer intensity={1.6} color={CYAN} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
          <Lightformer intensity={1.5} color={CYAN} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 0.5, 1]} />
          <Lightformer intensity={1.5} color={BLUE} position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[20, 0.5, 1]} />
        </Environment>

        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <MeshReflectorMaterial blur={[300, 80]} resolution={1024} mixBlur={1} mixStrength={6} roughness={0.85} depthScale={1} minDepthThreshold={0.4} maxDepthThreshold={1.4} color="#07090c" metalness={0.6} mirror={0.6} />
        </mesh>

        <Platform />
        <Wall />
        <pointLight position={[0, 4, -8]} intensity={18} color={RED} distance={12} />
        <Suspense fallback={null}>
          <Logo />
        </Suspense>
        <Brain active={shown !== null} />
        <Beam point={shown} />
        <FlyingMenu onOpen={openMenu} />
        <Sparkles count={80} scale={[14, 7, 10]} position={[0, 3.5, -2]} size={1.6} speed={0.25} color="#ff9aa0" opacity={0.5} />

        <Suspense fallback={null}>
          <Robot anim={anim} point={shown} listening={listening} waveId={waveId} onWaveEnd={endWave} />
          <Loaded onLoad={() => setLoaded(true)} />
        </Suspense>

        <OrbitControls target={[0, 2.45, 0]} enablePan={false} minDistance={7} maxDistance={16} minAzimuthAngle={-0.25} maxAzimuthAngle={0.25} minPolarAngle={1.25} maxPolarAngle={1.55} enableDamping />
        <EffectComposer multisampling={2}>
          <Bloom intensity={0.7} luminanceThreshold={0.85} mipmapBlur />
          <Vignette darkness={0.6} offset={0.3} />
        </EffectComposer>
      </Canvas>
      </div>

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
            <LiveZoord ref={voiceCommands} onPoint={pointToMenu} onGreeting={wave} onListening={setListening} />
          </div>
          <p className="mb-3 text-center text-xs text-muted-foreground">{shown !== null ? `ZOORD • ${MENU[shown]?.t.toUpperCase() ?? "DAKKAI"}` : `${loaded ? "DAKKAI IA • ONLINE" : "INICIANDO…"}`}</p>
          <nav className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
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
                    <p className="text-sm text-muted-foreground">{it.d}</p>
                  </div>
                  <span className="whitespace-nowrap font-display text-dakkai">{it.p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={WHATSAPP} target="_blank" rel="noreferrer" className="stage-chip stage-chip-red">Pedir no WhatsApp</a>
              <a href={ORDER_URL} target="_blank" rel="noreferrer" className="stage-chip">Cardápio digital ↗</a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Preços e disponibilidade podem variar. Rod. Rafael da Rocha Pires, 1650 — Sambaqui, Florianópolis/SC</p>
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
