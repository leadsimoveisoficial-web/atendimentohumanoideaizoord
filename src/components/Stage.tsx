import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  useAnimations,
  MeshReflectorMaterial,
  Environment,
  Lightformer,
  Sparkles,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import zoord from "@/assets/zoord.glb.asset.json";

const CYAN = "#3fe0ff";
const BLUE = "#2f7bff";

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

function Holo({ position, rot }: { position: [number, number, number]; rot: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(clock.elapsedTime + rot * 3) * 0.08;
  });
  return (
    <group ref={ref} position={position} rotation-y={rot}>
      <mesh>
        <planeGeometry args={[1.6, 1]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.07} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(1.6, 1)]} />
        <lineBasicMaterial color={CYAN} toneMapped={false} />
      </lineSegments>
      {[0.25, 0.05, -0.15, -0.3].map((y, i) => (
        <mesh key={i} position={[-0.3 + i * 0.05, y, 0.001]}>
          <planeGeometry args={[0.8 - i * 0.15, 0.025]} />
          <meshBasicMaterial color={i ? "#9fdcff" : CYAN} transparent opacity={0.7} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Network() {
  const ref = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 40; i++) pts.push(new THREE.Vector3().randomDirection().multiplyScalar(1.2 + Math.random() * 0.4));
    const seg: number[] = [];
    pts.forEach((a, i) => pts.forEach((b, j) => j > i && a.distanceTo(b) < 0.9 && seg.push(a.x, a.y, a.z, b.x, b.y, b.z)));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
    return g;
  }, []);
  useFrame((_, d) => ref.current && (ref.current.rotation.y += d * 0.08));
  return (
    <group ref={ref} position={[0, 6.2, -9]}>
      <lineSegments geometry={geo}>
        <lineBasicMaterial color={BLUE} transparent opacity={0.5} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

const ANIMS = ["Idle_12", "Formal_Bow", "Wave_One_Hand", "Stage_Walk", "Walking", "Hip_Hop_Dance_3", "All_Night_Dance", "Breakdance_1990", "Backflip_and_Rise", "Confused_Scratch"];
const label = (s: string) => s.replace(/_\d+$/, "").replace(/_/g, " ");

export function Stage() {
  const [anim, setAnim] = useState("Idle_12");
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="fixed inset-0 bg-background">
      <Canvas shadows dpr={[1, 2.5]} camera={{ position: [0, 1.1, 7.5], fov: 40 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
        <color attach="background" args={["#030507"]} />
        <fog attach="fog" args={["#030507", 12, 26]} />
        <ambientLight intensity={0.22} color="#8fdcff" />
        <pointLight position={[-4, 2, 2]} intensity={26} color={CYAN} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[4, 2, 2]} intensity={26} color={BLUE} />
        <Environment resolution={512}>
          <Lightformer intensity={1.6} color={CYAN} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
          <Lightformer intensity={1.5} color={CYAN} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 0.5, 1]} />
          <Lightformer intensity={1.5} color={BLUE} position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[20, 0.5, 1]} />
        </Environment>

        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <MeshReflectorMaterial blur={[300, 80]} resolution={2048} mixBlur={1} mixStrength={6} roughness={0.85} depthScale={1} minDepthThreshold={0.4} maxDepthThreshold={1.4} color="#07090c" metalness={0.6} mirror={0.6} />
        </mesh>

        <Platform />
        <Wall />
        <Network />
        <Holo position={[-3.6, 2.2, -1]} rot={0.5} />
        <Holo position={[3.6, 2.2, -1]} rot={-0.5} />
        <Holo position={[-5.5, 3.2, -4]} rot={0.6} />
        <Holo position={[5.5, 3.2, -4]} rot={-0.6} />
        <Sparkles count={120} scale={[14, 7, 10]} position={[0, 3.5, -2]} size={1.6} speed={0.25} color="#a8eaff" opacity={0.6} />

        <Suspense fallback={null}>
          <Robot anim={anim} />
          <Loaded onLoad={() => setLoaded(true)} />
        </Suspense>

        <OrbitControls target={[0, 1.3, 0]} enablePan={false} minDistance={3.5} maxDistance={12} maxPolarAngle={Math.PI / 2 - 0.05} autoRotate autoRotateSpeed={0.3} />
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.7} luminanceThreshold={0.85} mipmapBlur />
          <Vignette darkness={0.6} offset={0.3} />
        </EffectComposer>
      </Canvas>

      <div className="pointer-events-none fixed inset-0 flex flex-col justify-between p-6 md:p-10">
        <header className="flex items-center justify-between">
          <span className="font-display text-sm tracking-[0.5em] text-foreground">ZOORD</span>
          <span className="text-xs tracking-[0.3em] text-muted-foreground">{loaded ? "SYSTEM ONLINE" : "INITIALIZING…"}</span>
        </header>
        <nav className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
          {ANIMS.map((a) => (
            <button key={a} onClick={() => setAnim(a)} className={`stage-chip ${anim === a ? "stage-chip-active" : ""}`}>
              {label(a)}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Loaded({ onLoad }: { onLoad: () => void }) {
  useEffect(onLoad, [onLoad]);
  return null;
}
