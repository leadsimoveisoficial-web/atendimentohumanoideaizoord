import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const COUNT = 240;
export function RestaurantLeds({ restaurant }: { restaurant: THREE.Object3D }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const time = useRef(0);
  const reduced = useRef(false);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pixels = useMemo(() => {
    restaurant.updateWorldMatrix(true, true);
    const ray = new THREE.Raycaster();
    return Array.from({ length: COUNT }, (_, i) => {
      const angle = i * 2.399963;
      const radius = 0.8 + Math.sqrt(i / COUNT) * 6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * 0.7 + 0.5;
      ray.set(new THREE.Vector3(x, 1, z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(restaurant, true)[0];
      return { x, z, y: hit ? hit.point.y + 0.018 : -1.02, angle, valid: !!hit };
    });
  }, [restaurant]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reduced.current = preference.matches; };
    update();
    preference.addEventListener("change", update);
    const current = mesh.current;
    if (current) {
      pixels.forEach((_, i) => current.setColorAt(i, new THREE.Color(i % 3 === 0 ? "#c4141f" : "#2f7bff").multiplyScalar(2)));
      if (current.instanceColor) current.instanceColor.needsUpdate = true;
    }
    return () => preference.removeEventListener("change", update);
  }, [pixels]);
  useFrame((_, delta) => {
    const current = mesh.current;
    if (!current) return;
    if (!reduced.current) time.current += Math.min(delta, 0.05);
    pixels.forEach((pixel, i) => {
      const pulse = reduced.current ? 0.6 : 0.3 + 0.7 * Math.pow((Math.sin(pixel.angle - time.current * 1.5 + i * 0.03) + 1) / 2, 3);
      dummy.position.set(pixel.x, pixel.y, pixel.z);
      dummy.rotation.x = -Math.PI / 2;
      dummy.scale.setScalar(pixel.valid ? 0.035 + pulse * 0.055 : 0);
      dummy.updateMatrix();
      current.setMatrixAt(i, dummy.matrix);
    });
    current.instanceMatrix.needsUpdate = true;
  });
  return <group name="RestaurantUniverseLeds">
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <circleGeometry args={[1, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
    {[0, 1].map(i => <mesh key={i} position={[0, 0.29 - i * 0.35, 0]} rotation-x={Math.PI / 2}>
      <torusGeometry args={[2.95, 0.025, 6, 128]} />
      <meshBasicMaterial color={i === 0 ? "#2f7bff" : "#c4141f"} toneMapped={false} />
    </mesh>)}
  </group>;
}
