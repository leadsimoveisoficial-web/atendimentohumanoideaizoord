import { Canvas, useFrame } from "@react-three/fiber";
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
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import zoord from "@/assets/zoord.glb.asset.json";
import dakkaiLogo from "@/assets/dakkai-logo.png";
import { MENU, WHATSAPP, ORDER_URL } from "./menu";

const CYAN = "#3fe0ff";
const BLUE = "#2f7bff";
const RED = "#c4141f";

export function panelPos(i: number) {
  const half = Math.ceil(MENU.length / 2);
  const left = i < half;
  const row = left ? i : i - half;
  return new THREE.Vector3(left ? -4.6 : 4.6, 3.6 - row * 1.02, -2.2);
}

const _Y = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _pq = new THREE.Quaternion();
const _id = new THREE.Quaternion();

function Robot({ anim, point }: { anim: string; point: number | null }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(zoord.url);
  const { actions } = useAnimations(animations, group);
  const w = useRef(0);
  const side = useRef<"Left" | "Right">("Right");
  // Procedural pointing gesture, layered on top of the playing animation
  useFrame((_, d) => {
    w.current = THREE.MathUtils.damp(w.current, point === null ? 0 : 1, 4, d);
    if (w.current < 0.001) return;
    const target = panelPos(point ?? 0);
    if (point !== null) side.current = target.x < 0 ? "Left" : "Right";
    const arm = scene.getObjectByName(`mixamorig${side.current}Arm`) ?? scene.getObjectByName(`mixamorig:${side.current}Arm`);
    const fore = scene.getObjectByName(`mixamorig${side.current}ForeArm`) ?? scene.getObjectByName(`mixamorig:${side.current}ForeArm`);
    const head = scene.getObjectByName("mixamorigHead") ?? scene.getObjectByName("mixamorig:Head");
    if (!arm?.parent) return;
    arm.updateWorldMatrix(true, false);
    arm.getWorldPosition(_a);
    const dir = target.clone().sub(_a).normalize();
    _q.setFromUnitVectors(_Y, dir);
    arm.parent.getWorldQuaternion(_pq);
    _q.premultiply(_pq.invert());
    arm.quaternion.slerp(_q, w.current);
    fore?.quaternion.slerp(_id, w.current * 0.9);
    if (head) head.rotation.y += (target.x < 0 ? 0.35 : -0.35) * w.current;
  });
  useEffect(() => {
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }, [scene]);
  useEffect(() => {
    const a = actions[anim];
    a?.reset().fadeIn(0.4).play();
    return () => {
      a?.fadeOut(0.4);
    };
  }, [anim, actions]);
  return (
    <group ref={group} position={[0, 0.3, 0]}>
      <primitive object={scene} />
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
    <group position={[0, 4.4, -11.3]}>
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
  const s = MENU[i]!;
  const accent = i % 4 === 0 ? RED : i % 2 === 0 ? CYAN : BLUE;
  return (
    <group ref={g} position={[x, y, -2.2]}>
      {/* LED edge glow */}
      <mesh ref={led} position-z={-0.02}>
        <planeGeometry args={[1.96, 1.3]} />
        <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={0.7} />
      </mesh>
      <Html transform center distanceFactor={4.2} zIndexRange={[10, 0]} style={{ pointerEvents: "auto" }}>
        <button onClick={() => onOpen(i)} className="menu-led" style={{ ["--led" as string]: accent }}>
          <span className="menu-page-num">{String(i + 1).padStart(2, "0")} · DAKKAI</span>
          <h3>{s.t}</h3>
          <ul>
            {s.items.slice(0, 2).map((it) => (
              <li key={it.n}><span>{it.n}</span><b>{it.p}</b></li>
            ))}
          </ul>
          <em>{s.items.length} itens · toque para ver tudo</em>
        </button>
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
        const x = left ? -4.6 : 4.6;
        const y = 3.6 - row * 1.02;
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
  const line = useRef<THREE.Line>(null);
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  useFrame(({ clock }) => {
    if (point === null) return;
    const end = panelPos(point);
    const start = new THREE.Vector3(0, 9.6, -10);
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 1.5, 0));
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    geo.setFromPoints(curve.getPoints(40));
    const m = line.current?.material as THREE.LineBasicMaterial | undefined;
    if (m) m.opacity = 0.55 + Math.sin(clock.elapsedTime * 10) * 0.35;
  });
  if (point === null) return null;
  return (
    // @ts-expect-error three line element
    <line ref={line} geometry={geo}>
      <lineBasicMaterial color={RED} transparent toneMapped={false} />
    </line>
  );
}

function speakText(text: string, onEnd: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    const t = setTimeout(onEnd, 6000);
    return () => clearTimeout(t);
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-BR";
  u.rate = 1.02;
  const v = speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith("pt-br"));
  if (v) u.voice = v;
  u.onend = onEnd;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return () => {
    u.onend = null;
    speechSynthesis.cancel();
  };
}

function sectionSpeech(i: number) {
  const s = MENU[i]!;
  const items = s.items.slice(0, 3).map((it) => `${it.n}, por ${it.p.replace("R$", "").trim()} reais`).join("; ");
  const intro = i === 0 ? "Olá! Eu sou o Zoord, a inteligência do Dakkai Sushi. Vou te apresentar o nosso cardápio. " : "";
  return `${intro}Aqui em ${s.t}, temos ${items}.`;
}

const ANIMS = ["Idle_12", "Formal_Bow", "Wave_One_Hand", "Stage_Walk", "Walking", "Hip_Hop_Dance_3", "All_Night_Dance", "Breakdance_1990", "Backflip_and_Rise", "Confused_Scratch"];
const label = (s: string) => s.replace(/_\d+$/, "").replace(/_/g, " ");

export function Stage() {
  const [anim, setAnim] = useState("Idle_12");
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [point, setPoint] = useState<number | null>(null);
  useEffect(() => {
    if (point === null) return;
    return speakText(sectionSpeech(point), () => setPoint((p) => (p === null || p + 1 >= MENU.length ? null : p + 1)));
  }, [point]);
  return (
    <div className="fixed inset-0 bg-background">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1.1, 7.5], fov: 40 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
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
        <Brain active={point !== null} />
        <Beam point={point} />
        <FlyingMenu onOpen={setOpen} />
        <Sparkles count={80} scale={[14, 7, 10]} position={[0, 3.5, -2]} size={1.6} speed={0.25} color="#ff9aa0" opacity={0.5} />

        <Suspense fallback={null}>
          <Robot anim={anim} point={point} />
          <Loaded onLoad={() => setLoaded(true)} />
        </Suspense>

        <OrbitControls target={[0, 1.6, 0]} enablePan={false} minDistance={3.5} maxDistance={14} maxPolarAngle={Math.PI / 2 - 0.05} autoRotate autoRotateSpeed={0.3} />
        <EffectComposer multisampling={2}>
          <Bloom intensity={0.7} luminanceThreshold={0.85} mipmapBlur />
          <Vignette darkness={0.6} offset={0.3} />
        </EffectComposer>
      </Canvas>

      <div className="pointer-events-none fixed inset-0 flex flex-col justify-between p-6 md:p-10">
        <header className="flex items-center justify-between">
          <span className="font-display text-sm tracking-[0.5em] text-foreground">DAKKAI <span className="text-dakkai">×</span> ZOORD</span>
          <div className="pointer-events-auto flex items-center gap-3">
            <button onClick={() => setPoint((p) => (p === null ? 0 : null))} className={`stage-chip ${point !== null ? "stage-chip-active" : ""}`}>
              {point === null ? "Zoord apresenta" : "Parar"}
            </button>
            <button onClick={() => setOpen(0)} className="stage-chip">Cardápio</button>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="stage-chip stage-chip-red">Pedir no WhatsApp</a>
          </div>
        </header>
        <div>
          <p className="mb-3 text-center text-xs tracking-[0.3em] text-muted-foreground">{point !== null ? `ZOORD APRESENTANDO • ${MENU[point]!.t.toUpperCase()}` : `${loaded ? "DAKKAI IA • ONLINE" : "INICIANDO…"} — toque no cardápio flutuante`}</p>
          <nav className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
            {ANIMS.map((a) => (
              <button key={a} onClick={() => setAnim(a)} className={`stage-chip ${anim === a ? "stage-chip-active" : ""}`}>
                {label(a)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {open !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md" onClick={() => setOpen(null)}>
          <div className="menu-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <img src={dakkaiLogo} alt="DAKKAI Sushi" className="h-16 w-auto" />
              <button onClick={() => setOpen(null)} className="stage-chip" aria-label="Fechar">✕</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {MENU.map((s, i) => (
                <button key={s.t} onClick={() => setOpen(i)} className={`stage-chip ${open === i ? "stage-chip-active" : ""}`}>{s.t}</button>
              ))}
            </div>
            <h2 className="mt-6 font-display text-2xl tracking-widest text-foreground">{MENU[open]!.t}</h2>
            <ul className="mt-4 space-y-3">
              {MENU[open]!.items.map((it) => (
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
        </div>
      )}
    </div>
  );
}

function Loaded({ onLoad }: { onLoad: () => void }) {
  useEffect(onLoad, [onLoad]);
  return null;
}
