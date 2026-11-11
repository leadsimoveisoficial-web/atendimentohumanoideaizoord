import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { bindJadeClothing } from "./jade-clothing";

describe("Jade garment skinning", () => {
  it("follows the body bone instead of staying static when the torso turns", () => {
    const scene = new THREE.Group();
    const bone = new THREE.Bone(); scene.add(bone);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position",new THREE.Float32BufferAttribute([1,1,0, 1,2,0, 2,1,0],3));
    geometry.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(new Array(12).fill(0),4));
    geometry.setAttribute("skinWeight",new THREE.Float32BufferAttribute([1,0,0,0, 1,0,0,0, 1,0,0,0],4));
    const body = new THREE.SkinnedMesh(geometry); scene.add(body);
    body.bind(new THREE.Skeleton([bone]));
    const cloth = new THREE.Mesh(geometry.clone()); scene.add(cloth);
    const garment = bindJadeClothing(cloth,body); scene.add(garment);
    bone.rotation.z = Math.PI/2; scene.updateMatrixWorld(true);
    const vertex = garment.getVertexPosition(0,new THREE.Vector3());
    expect(vertex.x).toBeCloseTo(-1); expect(vertex.y).toBeCloseTo(1);
    expect(Math.abs(vertex.z)).toBeCloseTo(0.06);
    expect(garment.skeleton).toBe(body.skeleton);
    expect(garment.geometry.getAttribute("skinWeight").getX(0)).toBeCloseTo(1);
  });
  it("removes transparent tears without changing the source fabric material", () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.Float32BufferAttribute([0,1,0, 1,1,0, 0,2,0],3));
    g.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(new Array(12).fill(0),4));
    g.setAttribute("skinWeight",new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
    const body = new THREE.SkinnedMesh(g); body.bind(new THREE.Skeleton([new THREE.Bone()]));
    const material = new THREE.MeshStandardMaterial({transparent:true,opacity:0.5,alphaTest:0.5});
    const cloth = new THREE.Mesh(g,material);
    const garment = bindJadeClothing(cloth,body);
    const fabric = Array.isArray(garment.material) ? garment.material[0] : garment.material;
    expect(fabric?.transparent).toBe(false);
    expect(fabric?.alphaTest).toBe(0);
    expect(material.opacity).toBe(0.5);
  });
});