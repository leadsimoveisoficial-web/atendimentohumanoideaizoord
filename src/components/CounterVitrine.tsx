import { useMemo } from "react";
import * as THREE from "three";

const CYAN = "#3fe0ff";
const FRAME = "#10141b";
const GLASS = "#9fdcff";

/**
 * Clean glass display case mounted on the counter front, covering the baked
 * counter branding. The wall logo above stays untouched.
 * Counter face measured at z ≈ -8.55 (curved -8.37…-8.73), logo y 0.7…2.7, x ±2.5.
 */
export function CounterVitrine() {
  const glass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: GLASS,
        transparent: true,
        opacity: 0.14,
        roughness: 0.05,
        metalness: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );
  const frame = useMemo(
    () => new THREE.MeshStandardMaterial({ color: FRAME, roughness: 0.4, metalness: 0.6 }),
    []
  );

  const W = 5.8; // width
  const H = 2.3; // height
  const D = 0.95; // depth
  const BASE = 0.5; // floor clearance
  const cx = 0;
  const cy = BASE + H / 2; // 1.65
  const cz = -7.82; // back panel sits just in front of the counter face

  const posts: [number, number][] = [
    [-W / 2, -D / 2],
    [W / 2, -D / 2],
    [-W / 2, D / 2],
    [W / 2, D / 2],
  ];
  const shelves = [0.62, 1.28];
  // Simple maki rolls on the shelves: nori body, rice top, filling dot.
  const rolls = useMemo(() => {
    const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const rand = rng(42);
    const list: { x: number; y: number; z: number; fill: string }[] = [];
    const fills = ["#ff8a5c", "#7bc96f", "#f5f0e6"];
    shelves.forEach((sy) => {
      for (let i = 0; i < 9; i++) {
        list.push({
          x: -W / 2 + 0.55 + i * 0.58 + rand() * 0.1,
          y: sy + 0.09,
          z: (rand() - 0.5) * (D - 0.5),
          fill: fills[i % fills.length],
        });
      }
    });
    return list;
  }, []);

  return (
    <group name="CounterVitrine" position={[cx, cy, cz]}>
      {/* base plinth and top frame */}
      <mesh position={[0, -H / 2 + 0.05, 0]} material={frame}>
        <boxGeometry args={[W + 0.08, 0.1, D + 0.08]} />
      </mesh>
      <mesh position={[0, H / 2 - 0.04, 0]} material={frame}>
        <boxGeometry args={[W + 0.08, 0.08, D + 0.08]} />
      </mesh>
      {/* corner posts */}
      {posts.map(([px, pz], i) => (
        <mesh key={i} position={[px, 0, pz]} material={frame}>
          <boxGeometry args={[0.07, H, 0.07]} />
        </mesh>
      ))}
      {/* back panel: opaque, hides the baked counter logo */}
      <mesh position={[0, 0, -D / 2 + 0.02]}>
        <boxGeometry args={[W, H, 0.04]} />
        <meshStandardMaterial color="#0d1117" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* glass: front, left, right, top */}
      <mesh position={[0, 0, D / 2]} material={glass}>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh position={[-W / 2, 0, 0]} rotation-y={Math.PI / 2} material={glass}>
        <planeGeometry args={[D, H]} />
      </mesh>
      <mesh position={[W / 2, 0, 0]} rotation-y={-Math.PI / 2} material={glass}>
        <planeGeometry args={[D, H]} />
      </mesh>
      <mesh position={[0, H / 2 - 0.09, 0]} rotation-x={Math.PI / 2} material={glass}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* glass shelves */}
      {shelves.map((sy) => (
        <mesh key={sy} position={[0, sy - H / 2, 0]} material={glass}>
          <boxGeometry args={[W - 0.12, 0.025, D - 0.12]} />
        </mesh>
      ))}
      {/* interior LED strip under the top frame */}
      <mesh position={[0, H / 2 - 0.1, 0]}>
        <boxGeometry args={[W - 0.2, 0.02, 0.04]} />
        <meshBasicMaterial color={CYAN} toneMapped={false} />
      </mesh>
      <pointLight position={[0, H / 2 - 0.4, 0]} intensity={6} color={CYAN} distance={4} decay={1.8} />
      {/* maki rolls */}
      {rolls.map((r, i) => (
        <group key={i} position={[r.x, r.y - H / 2, r.z]}>
          <mesh>
            <cylinderGeometry args={[0.085, 0.085, 0.11, 20]} />
            <meshStandardMaterial color="#14210f" roughness={0.7} />
          </mesh>
          <mesh position-y={0.045}>
            <cylinderGeometry args={[0.07, 0.07, 0.03, 20]} />
            <meshStandardMaterial color="#f2ede2" roughness={0.9} />
          </mesh>
          <mesh position-y={0.062}>
            <cylinderGeometry args={[0.028, 0.028, 0.012, 12]} />
            <meshStandardMaterial color={r.fill} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
