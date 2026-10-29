import { useLayoutEffect, useState } from "react";

/** Standalone circular dais under Zoord (top at y=0.3), replacing the restaurant backdrop. */
export function StagePlatform({ cyan, blue, red }: { cyan: string; blue: string; red: string }) {
  const [c, setC] = useState<{ cyan: string; blue: string; red: string; wood: string; base: string } | null>(null);
  useLayoutEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const v = (n: string) => css.getPropertyValue(n).trim();
    setC({ cyan, blue, red, wood: v("--stage-platform-top"), base: v("--stage-platform-base") });
  }, [cyan, blue, red]);
  if (!c) return null;
  return (
    <group name="StagePlatform">
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[2.6, 2.75, 0.2, 96]} />
        <meshStandardMaterial color={c.base} roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <cylinderGeometry args={[2.35, 2.45, 0.1, 96]} />
        <meshStandardMaterial color={c.wood} roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.205, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[2.62, 0.025, 12, 160]} />
        <meshBasicMaterial color={c.blue} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[2.8, 0.025, 12, 160]} />
        <meshBasicMaterial color={c.red} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.302, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.2, 2.24, 128]} />
        <meshBasicMaterial color={c.cyan} toneMapped={false} />
      </mesh>
    </group>
  );
}
