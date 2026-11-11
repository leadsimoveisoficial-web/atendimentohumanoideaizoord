import * as THREE from "three";

/** Opaque fitted lining reuses skin weights, so coverage follows the actual torso. */
export function createJadeCoverage(body: THREE.SkinnedMesh, color: string) {
  const geometry = body.geometry.clone();
  const positions = geometry.getAttribute("position");
  const source = geometry.index;
  const indices: number[] = [];
  const count = source?.count ?? positions.count;
  for (let i = 0; i < count; i += 3) {
    const triangle = [0, 1, 2].map(j => source ? source.getX(i + j) : i + j);
    if (triangle.every(j => positions.getY(j) >= 9.8 && positions.getY(j) <= 16 && Math.abs(positions.getX(j)) <= 1.85)) indices.push(...triangle);
  }
  geometry.setIndex(indices);
  geometry.clearGroups();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const lining = new THREE.SkinnedMesh(geometry, material);
  lining.name = "JadeOpaqueTorsoLining";
  lining.position.copy(body.position);
  lining.quaternion.copy(body.quaternion);
  lining.scale.copy(body.scale);
  lining.bindMode = body.bindMode;
  lining.bind(body.skeleton, body.bindMatrix);
  lining.frustumCulled = false;
  return lining;
}