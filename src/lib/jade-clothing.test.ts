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
    expect(garment.skeleton).toBe(body.skeleton);
    expect(garment.geometry.getAttribute("skinWeight").getX(0)).toBeCloseTo(1);
  });
  it("preserves original dress vertices while adding body movement", () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.Float32BufferAttribute([0,1,0, 1,1,0, 0,2,0],3));
    g.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(new Array(12).fill(0),4));
    g.setAttribute("skinWeight",new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
    const body = new THREE.SkinnedMesh(g); body.bind(new THREE.Skeleton([new THREE.Bone()]));
    const material = new THREE.MeshStandardMaterial({transparent:true,opacity:0.5,alphaTest:0.5});
    const cloth = new THREE.Mesh(g,material);
    const garment = bindJadeClothing(cloth,body);
    expect(Array.from(garment.geometry.getAttribute("position").array)).toEqual([0,1,0, 1,1,0, 0,2,0]);
    expect(garment.geometry).not.toBe(g);
    expect(garment.skeleton).toBe(body.skeleton);
  });
  it("uses the nearest body vertices rather than their source order", () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position",new THREE.Float32BufferAttribute([0.4,1,0, 0.3,1,0, 0.2,1,0, 0.1,1,0],3));
    geometry.setAttribute("skinIndex",new THREE.Uint16BufferAttribute([0,0,0,0, 1,0,0,0, 2,0,0,0, 3,0,0,0],4));
    geometry.setAttribute("skinWeight",new THREE.Float32BufferAttribute([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],4));
    const body = new THREE.SkinnedMesh(geometry);
    body.bind(new THREE.Skeleton(Array.from({length:4},()=>new THREE.Bone())));
    const clothGeometry = new THREE.BufferGeometry();
    clothGeometry.setAttribute("position",new THREE.Float32BufferAttribute([0,1,0],3));
    const garment = bindJadeClothing(new THREE.Mesh(clothGeometry),body);
    const indices = garment.geometry.getAttribute("skinIndex");
    const weights = garment.geometry.getAttribute("skinWeight");
    expect([indices.getX(0),indices.getY(0),indices.getZ(0)]).toEqual([3,2,1]);
    expect(weights.getX(0)+weights.getY(0)+weights.getZ(0)+weights.getW(0)).toBeCloseTo(1);
  });
});