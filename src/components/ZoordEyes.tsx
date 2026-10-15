import { createPortal, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gaze } from "@/lib/gaze";

/** Eyelid closure 0..1 for a blink started at `t0`: fast close, slightly slower open (~150 ms total). */
export function blinkAmount(t: number, t0: number) {
  const dt = t - t0;
  if (dt < 0 || dt > 0.16) return 0;
  return dt < 0.06 ? dt / 0.06 : 1 - (dt - 0.06) / 0.1;
}

// LED eye glints layered on the supplied face (head-local); they blink and glance without editing the mesh.
export function ZoordEyes({ scene, y = 13.5, z = 10.5, spread = 2.7, rotationX = -0.2 }: { scene: THREE.Object3D; y?: number; z?: number; spread?: number; rotationX?: number }) {
  const [head, setHead] = useState<THREE.Object3D | null>(null);
  const [color, setColor] = useState<string>();
  const group = useRef<THREE.Group>(null);
  const eyes = useRef<(THREE.Mesh | null)[]>([]);
  const blink = useRef({ start: -1, next: 2, second: false });
  useLayoutEffect(() => {
    setHead(scene.getObjectByName("mixamorig:Head") ?? scene.getObjectByName("mixamorigHead") ?? null);
    setColor(getComputedStyle(document.documentElement).getPropertyValue("--stage-led-cyan").trim());
  }, [scene]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const b = blink.current;
    if (t >= b.next) {
      b.start = t;
      // Humans blink every 2–6 s, sometimes twice in a row.
      b.second = !b.second && Math.random() < 0.18;
      b.next = t + (b.second ? 0.28 : 2 + Math.random() * 4);
    }
    const closed = blinkAmount(t, b.start);
    for (const eye of eyes.current) {
      if (!eye) continue;
      eye.scale.y = Math.max(0.08, 1 - closed);
      eye.position.x = (eye.userData["side"] as number) * spread + gaze.x * 0.35;
      eye.position.y = -gaze.y * 0.25;
    }
  });
  if (!head || !color) return null;
  return createPortal(
    <group ref={group} name="ZoordEyes" position={[-1.7, y, z]} rotation-x={rotationX}>
      {[-1, 1].map((side, i) => (
        <mesh key={side} ref={(m) => { eyes.current[i] = m; }} userData={{ side }} position-x={side * spread}>
          <circleGeometry args={[0.6, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ))}
    </group>, head,
  );
}
