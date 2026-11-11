import * as THREE from "three";

/** Fitted fabric extensions reuse the dress texture and body weights. */
export function createJadeCoverage(body: THREE.SkinnedMesh, dress: THREE.SkinnedMesh, underdressColor?: string) {
  const geometry = body.geometry.clone();
  const positions = geometry.getAttribute("position");
  const source = geometry.index;
  const indices: number[] = [];
  const count = source?.count ?? positions.count;
  for (let i = 0; i < count; i += 3) {
    const triangle = [0, 1, 2].map(j => source ? source.getX(i + j) : i + j);
    if (triangle.every(j => positions.getY(j) >= 9.8 && positions.getY(j) <= 16.6 && Math.abs(positions.getX(j)) <= (positions.getY(j) > 16 ? 0.7 : 1.85))) indices.push(...triangle);
  }
  geometry.setIndex(indices);
  geometry.clearGroups();
  geometry.deleteAttribute("tangent");
  geometry.computeVertexNormals();
  const fabricPositions = dress.geometry.getAttribute("position");
  const fabricUV = dress.geometry.getAttribute("uv");
  if (fabricUV) {
    const buckets = new Map<string, number[]>();
    const key = (x: number, y: number, z: number) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    for (let i = 0; i < fabricPositions.count; i++) {
      const cell = key(fabricPositions.getX(i), fabricPositions.getY(i), fabricPositions.getZ(i));
      const entries = buckets.get(cell) ?? []; entries.push(i); buckets.set(cell, entries);
    }
    const uv = new THREE.Float32BufferAttribute(new Float32Array(positions.count * 2), 2);
    for (const i of new Set(indices)) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      let best = -1, distance = Infinity;
      for (let radius = 1; radius <= 4 && best < 0; radius++) {
        for (let a = -radius; a <= radius; a++) for (let b = -radius; b <= radius; b++) for (let c = -radius; c <= radius; c++) {
          for (const j of buckets.get(key(x + a, y + b, z + c)) ?? []) {
            const d = (fabricPositions.getX(j)-x)**2 + (fabricPositions.getY(j)-y)**2 + (fabricPositions.getZ(j)-z)**2;
            if (d < distance) { best = j; distance = d; }
          }
        }
      }
      if (best >= 0) uv.setXY(i, fabricUV.getX(best), fabricUV.getY(best));
    }
    geometry.setAttribute("uv", uv);
  }
  const sourceMaterial = Array.isArray(dress.material) ? dress.material[0] : dress.material;
  const material = sourceMaterial?.clone() ?? new THREE.MeshStandardMaterial();
  if (material instanceof THREE.MeshStandardMaterial) {
    // Dress tangent-space detail cannot be reused on the body's different topology.
    material.normalMap = null;
    material.bumpMap = null;
    material.displacementMap = null;
    if (underdressColor) {
      material.color.set(underdressColor);
      material.map = null;
      material.emissiveMap = null;
      material.emissiveIntensity = 0;
      material.roughness = 0.9;
      material.metalness = 0;
    }
  }
  material.transparent = false;
  material.opacity = 1;
  material.alphaTest = 0;
  material.side = THREE.DoubleSide;
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -1;
  const lining = new THREE.SkinnedMesh(geometry, material);
  lining.name = "JadeFittedDressExtension";
  lining.position.copy(body.position);
  lining.quaternion.copy(body.quaternion);
  lining.scale.copy(body.scale);
  lining.bindMode = body.bindMode;
  lining.bind(body.skeleton, body.bindMatrix);
  lining.frustumCulled = false;
  return lining;
}