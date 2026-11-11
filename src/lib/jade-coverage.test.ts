import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createJadeCoverage } from "./jade-coverage";

describe("Jade opaque lining", () => {
  it("covers the torso with the original skin weights and excludes the face", () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([-1,12,1, 1,12,1, 0,15,1, -1,17,1, 1,17,1, 0,18,1],3));
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(new Array(24).fill(0),4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(Array.from({length:24},(_,i)=> i%4===0?1:0),4));
    const body = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial());
    body.bind(new THREE.Skeleton([new THREE.Bone()]));
    const lining = createJadeCoverage(body, "#202020");
    expect(lining.geometry.index?.count).toBe(3);
    expect(lining.skeleton).toBe(body.skeleton);
    expect(lining.geometry.getAttribute("skinWeight").array).toEqual(g.getAttribute("skinWeight").array);
    expect(lining.material.transparent).toBe(false);
  });
});