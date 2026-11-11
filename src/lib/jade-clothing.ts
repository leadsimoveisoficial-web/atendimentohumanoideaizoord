import * as THREE from "three";

/** Transfer body skin weights in bind space; the original garment was exported without a skin. */
export function bindJadeClothing(cloth: THREE.Mesh, body: THREE.SkinnedMesh) {
  body.updateWorldMatrix(true, false);
  cloth.updateWorldMatrix(true, false);
  const geometry = cloth.geometry.clone();
  geometry.applyMatrix4(body.matrixWorld.clone().invert().multiply(cloth.matrixWorld));
  const positions = geometry.getAttribute("position");
  const skin = body.geometry.getAttribute("position");
  const originalIndices = body.geometry.getAttribute("skinIndex");
  const originalWeights = body.geometry.getAttribute("skinWeight");
  const buckets = new Map<string, number[]>();
  const cell = 0.5;
  for (let i = 0; i < skin.count; i++) {
    const key = `${Math.floor(skin.getX(i)/cell)},${Math.floor(skin.getY(i)/cell)},${Math.floor(skin.getZ(i)/cell)}`;
    const entries = buckets.get(key) ?? []; entries.push(i); buckets.set(key, entries);
  }
  const indices = new Uint16Array(positions.count * 4);
  const weights = new Float32Array(positions.count * 4);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const cx = Math.floor(x/cell), cy = Math.floor(y/cell), cz = Math.floor(z/cell);
    let candidates: number[] = [];
    for (let radius = 1; radius <= 4 && candidates.length === 0; radius++) {
      for (let a = -radius; a <= radius; a++) for (let b = -radius; b <= radius; b++) for (let c = -radius; c <= radius; c++) {
        const bucket = buckets.get(`${cx+a},${cy+b},${cz+c}`);
        if (bucket) candidates.push(...bucket);
      }
    }
    if (!candidates.length) candidates = Array.from({length:skin.count}, (_,j)=>j);
    const nearest = candidates.map(j => ({j, d:(skin.getX(j)-x)**2+(skin.getY(j)-y)**2+(skin.getZ(j)-z)**2})).sort((a,b)=>a.d-b.d).slice(0,3);
    const neckVertex = nearest[0];
    if (y >= 16 && Math.abs(x) < 0.8 && neckVertex) {
      // Fit only the collar to the native neck, leaving the rest of the dress unchanged.
      const j = neckVertex.j;
      positions.setXYZ(i,
        THREE.MathUtils.lerp(x, skin.getX(j), 0.85),
        THREE.MathUtils.lerp(y, skin.getY(j), 0.85),
        THREE.MathUtils.lerp(z, skin.getZ(j), 0.85));
    }
    const influence = new Map<number, number>();
    for (const {j,d} of nearest) for (let k=0;k<4;k++) {
      const bone = originalIndices.getComponent(j,k);
      influence.set(bone, (influence.get(bone) ?? 0) + originalWeights.getComponent(j,k)/Math.max(d,0.00001));
    }
    const strongest = [...influence].sort((a,b)=>b[1]-a[1]).slice(0,4);
    const total = strongest.reduce((sum, [,w])=>sum+w,0);
    strongest.forEach(([bone,w],k)=>{indices[i*4+k]=bone;weights[i*4+k]=total>0?w/total:0;});
  }
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(indices,4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights,4));
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  // Preserve the uploaded fabric; only add skeletal deformation, not a replacement surface.
  const prepareFabric = (source: THREE.Material) => {
    const material = source.clone();
    // Keep the original cut/texture; avoid skin winning the depth test at close fabric contact.
    material.side = THREE.DoubleSide;
    material.polygonOffset = true;
    material.polygonOffsetFactor = -2;
    material.polygonOffsetUnits = -2;
    return material;
  };
  const garment = new THREE.SkinnedMesh(geometry,Array.isArray(cloth.material) ? cloth.material.map(prepareFabric) : prepareFabric(cloth.material));
  if (cloth.morphTargetInfluences && garment.morphTargetInfluences) {
    garment.morphTargetInfluences = [...cloth.morphTargetInfluences];
  }
  garment.name = "JadeRiggedDress";
  garment.position.copy(body.position); garment.quaternion.copy(body.quaternion); garment.scale.copy(body.scale);
  garment.bindMode = body.bindMode;
  garment.bind(body.skeleton,body.bindMatrix);
  garment.frustumCulled = false;
  garment.castShadow = true;
  return garment;
}