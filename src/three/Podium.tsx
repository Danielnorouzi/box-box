import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DriverFigure } from './DriverFigure';
import type { Helmet } from '../types';
import { useQuality } from './quality';
import { numberDecal } from './textures';

export interface PodiumDriver { primary: string; secondary: string; number: number; helmet: Helmet; you: boolean }

const BLOCKS: { pos: 1 | 2 | 3; x: number; h: number }[] = [
  { pos: 2, x: -1.15, h: 0.55 }, { pos: 1, x: 0, h: 0.8 }, { pos: 3, x: 1.15, h: 0.4 },
];

/** Champagne: instanced droplets fired in arcs from the winner's bottle, falling under gravity. */
function Champagne({ origin, count, reduce }: { origin: THREE.Vector3; count: number; reduce: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const state = useMemo(() => Array.from({ length: count }, (_, i) => ({ t: -(i / count) * 1.6, v: new THREE.Vector3(), p: new THREE.Vector3() })), [count]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }, dt) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    const aim = Math.sin(t * 1.3) * 0.9; // the bottle sweeps across the podium
    state.forEach((d, i) => {
      d.t += reduce ? 0 : dt;
      if (d.t > 1.6 || d.t === 0) {
        d.t = 0.0001;
        d.p.copy(origin);
        const spread = (Math.random() - 0.5) * 0.35;
        d.v.set(Math.sin(aim + spread) * 2.2, 3.2 + Math.random() * 0.8, Math.cos(aim + spread) * 1.4 + 0.6);
      }
      if (d.t < 0) { sc.setScalar(0); }
      else {
        d.v.y -= 9.8 * dt * 0.55;
        d.p.addScaledVector(d.v, dt);
        sc.setScalar(0.009 + 0.011 * Math.min(1, d.t * 2));
      }
      m.compose(d.p, q, sc);
      mesh.current!.setMatrixAt(i, m);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial color="#fff1b8" roughness={0.15} metalness={0.1} emissive="#b08a2a" emissiveIntensity={0.9} transparent opacity={0.9} />
    </instancedMesh>
  );
}

function Confetti({ count, reduce }: { count: number; reduce: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 3, s: 0.4 + Math.random() * 0.6, ph: Math.random() * 10, c: Math.random() })), [count]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const pal = ['#f4d27a', '#ffffff', '#ff5a5a', '#9fd2ff'].map(c => new THREE.Color(c));
    seeds.forEach((sd, i) => pal[Math.floor(sd.c * pal.length)].toArray(arr, i * 3));
    return arr;
  }, [count, seeds]);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = reduce ? 2 : clock.getElapsedTime();
    seeds.forEach((sd, i) => {
      const y = 4.5 - ((t * sd.s * 0.8 + sd.ph) % 5);
      e.set(t * 2 * sd.s + sd.ph, t * 1.3 + sd.ph, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(sd.x + Math.sin(t + sd.ph) * 0.2, y, sd.z), q, new THREE.Vector3(0.05, 0.03, 0.003));
      mesh.current!.setMatrixAt(i, m);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]}>
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </boxGeometry>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.4} metalness={0.3} />
    </instancedMesh>
  );
}

export function Podium({ drivers, reduce }: { drivers: [PodiumDriver, PodiumDriver, PodiumDriver]; reduce: boolean }) {
  const q = useQuality();
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock, camera }) => {
    if (reduce) return;
    const t = clock.getElapsedTime();
    camera.position.x = Math.sin(t * 0.15) * 1.2;
    camera.lookAt(0, 1.2, 0);
  });
  const winnerTop = BLOCKS[1].h;
  return (
    <group ref={group}>
      {BLOCKS.map(b => {
        const d = drivers[b.pos - 1];
        return (
          <group key={b.pos} position={[b.x, 0, 0]}>
            <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.05, b.h, 0.9]} />
              <meshPhysicalMaterial color="#17191d" roughness={0.35} clearcoat={0.8} />
            </mesh>
            <mesh position={[0, b.h / 2, 0.452]}>
              <planeGeometry args={[0.42, 0.42]} />
              <meshStandardMaterial map={numberDecal(b.pos, '#f4f5f7', 'rgba(0,0,0,0)')} transparent />
            </mesh>
            <mesh position={[0, b.h + 0.005, 0]}>
              <boxGeometry args={[1.06, 0.01, 0.91]} />
              <meshStandardMaterial color={b.pos === 1 ? '#d9b45a' : b.pos === 2 ? '#c9ced6' : '#c07a45'} metalness={1} roughness={0.25} />
            </mesh>
            <group position={[0, b.h, 0]} rotation={[0, b.pos === 2 ? 0.25 : b.pos === 3 ? -0.25 : 0, 0]}>
              <DriverFigure {...d} pose={b.pos === 1 ? 'spray' : 'celebrate'} idle={!reduce} seg={q.seg} />
            </group>
          </group>
        );
      })}
      <Champagne origin={new THREE.Vector3(0.25, winnerTop + 1.55, 0.35)} count={reduce ? 0 : q.particles} reduce={reduce} />
      <Confetti count={reduce ? 0 : Math.round(q.particles * 0.5)} reduce={reduce} />
    </group>
  );
}
