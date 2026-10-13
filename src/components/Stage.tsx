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
import { MENU, WHATSAPP, ORDER_URL, type Section } from "./menu";

const CYAN = "#3fe0ff";
const BLUE = "#2f7bff";
const RED = "#c4141f";

function Robot({ anim }: { anim: string }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(zoord.url);
  const { actions } = useAnimations(animations, group);
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
    <group position={[0, 5.2, -11.3]}>
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

function MenuPage({ s, i, n, onOpen }: { s: Section; i: number; n: number; onOpen: () => void }) {
  const ref = useRef<THREE.Group>(null);
  // Arc ONLY behind Zoord: spread panels across ±62° at the back of the stage
  const a = n > 1 ? ((i / (n - 1)) - 0.5) * 2.16 : 0;
  const R = 6.8;
  const y0 = 2.0 + (i % 3) * 0.6;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.position.y = y0 + Math.sin(t * 0.8 + i) * 0.12;
    ref.current.rotation.z = Math.sin(t * 0.6 + i) * 0.03;
  });
  return (
    <group ref={ref} position={[Math.sin(a) * R, y0, -Math.cos(a) * R]} rotation-y={-a}>
      <Html transform distanceFactor={4.2} zIndexRange={[10, 0]} style={{ pointerEvents: "auto" }}>
        <button onClick={onOpen} className="menu-page">
          <span className="menu-page-num">{String(i + 1).padStart(2, "0")}</span>
          <h3>{s.t}</h3>
          <ul>
            {s.items.slice(0, 4).map((it) => (
              <li key={it.n}><span>{it.n}</span><b>{it.p}</b></li>
            ))}
          </ul>
          {s.items.length > 4 && <em>+{s.items.length - 4} itens</em>}
        </button>
      </Html>
    </group>
  );
}

function FlyingMenu({ onOpen }: { onOpen: (i: number) => void }) {
  const ref = useRef<THREE.Group>(null);
  // gentle sway only — panels stay behind the robot
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.04;
  });
  return (
    <group ref={ref}>
      {MENU.map((s, i) => <MenuPage key={s.t} s={s} i={i} n={MENU.length} onOpen={() => onOpen(i)} />)}
    </group>
  );
}

// "Cérebro" DAKKAI IA: neural sphere pulsing in red + cyan
function Brain() {
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
    if (ref.current) ref.current.rotation.y += d * 0.12;
    if (core.current) core.current.scale.setScalar(0.45 + Math.sin(clock.elapsedTime * 2) * 0.05);
  });
  return (
    <group position={[0, 8.6, -10]}>
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

const ANIMS = ["Idle_12", "Formal_Bow", "Wave_One_Hand", "Stage_Walk", "Walking", "Hip_Hop_Dance_3", "All_Night_Dance", "Breakdance_1990", "Backflip_and_Rise", "Confused_Scratch"];
const label = (s: string) => s.replace(/_\d+$/, "").replace(/_/g, " ");

export function Stage() {
  const [anim, setAnim] = useState("Idle_12");
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
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
        <Brain />
        <FlyingMenu onOpen={setOpen} />
        <Sparkles count={80} scale={[14, 7, 10]} position={[0, 3.5, -2]} size={1.6} speed={0.25} color="#ff9aa0" opacity={0.5} />

        <Suspense fallback={null}>
          <Robot anim={anim} />
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
            <button onClick={() => setOpen(0)} className="stage-chip">Cardápio</button>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="stage-chip stage-chip-red">Pedir no WhatsApp</a>
          </div>
        </header>
        <div>
          <p className="mb-3 text-center text-xs tracking-[0.3em] text-muted-foreground">{loaded ? "DAKKAI IA • ONLINE" : "INICIANDO…"} — toque numa página do cardápio</p>
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
