import { useMemo } from 'react';
import * as THREE from 'three';
import { plaque } from './textures';

export const METAL = { 1: '#d9b45a', 2: '#c9ced6', 3: '#c07a45' } as const;
const METAL_ROUGH = { 1: 0.18, 2: 0.16, 3: 0.24 } as const;

type Profile = [number, number][];

// Silhouettes as (radius, height) profiles, turned on a lathe. Each Grand Prix gets one family,
// picked from its id, so the same race always gives the same shape.
const FAMILIES: { name: string; profile: Profile; handles?: boolean; ring?: boolean; orb?: boolean }[] = [
  { name: 'cup', handles: true, profile: [[0.24, 0], [0.24, 0.06], [0.08, 0.1], [0.05, 0.3], [0.09, 0.36], [0.2, 0.44], [0.26, 0.6], [0.27, 0.72], [0.25, 0.73], [0.22, 0.62], [0.001, 0.5]] },
  { name: 'spire', profile: [[0.22, 0], [0.22, 0.05], [0.1, 0.09], [0.08, 0.3], [0.12, 0.42], [0.06, 0.7], [0.02, 0.95], [0.001, 1.0]] },
  { name: 'bowl', profile: [[0.2, 0], [0.2, 0.05], [0.06, 0.1], [0.04, 0.36], [0.1, 0.4], [0.32, 0.47], [0.35, 0.5], [0.3, 0.5], [0.001, 0.44]] },
  { name: 'ring', ring: true, profile: [[0.22, 0], [0.22, 0.05], [0.07, 0.09], [0.05, 0.22], [0.001, 0.24]] },
  { name: 'drop', profile: [[0.2, 0], [0.2, 0.05], [0.06, 0.1], [0.05, 0.22], [0.16, 0.42], [0.2, 0.55], [0.15, 0.7], [0.06, 0.82], [0.001, 0.86]] },
  { name: 'globe', orb: true, profile: [[0.24, 0], [0.24, 0.06], [0.1, 0.1], [0.06, 0.32], [0.001, 0.34]] },
];

export function familyFor(key: string) {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return FAMILIES[(h >>> 0) % (FAMILIES.length - 1)]; // the globe is kept for championships
}

export function Trophy({ shapeKey, position, scale = 1, lines, champion, seg = 48 }: {
  shapeKey: string; position: 1 | 2 | 3; scale?: number; lines?: string[]; champion?: boolean; seg?: number;
}) {
  const fam = champion ? FAMILIES[5] : familyFor(shapeKey);
  const geo = useMemo(() => new THREE.LatheGeometry(fam.profile.map(([r, h]) => new THREE.Vector2(r, h)), seg), [fam, seg]);
  const color = METAL[position];
  const metal = <meshPhysicalMaterial color={color} metalness={1} roughness={METAL_ROUGH[position]} clearcoat={0.6} clearcoatRoughness={0.1} side={THREE.DoubleSide} />;
  const tex = useMemo(() => (lines ? plaque(lines, color) : null), [lines, color]);
  const s = champion ? scale * 1.35 : scale;
  return (
    <group scale={s}>
      {/* plinth */}
      <mesh position={[0, -0.09, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.18, 0.52]} />
        <meshPhysicalMaterial color="#121316" roughness={0.25} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>
      {tex && (
        <mesh position={[0, -0.09, 0.262]}>
          <planeGeometry args={[0.42, 0.13]} />
          <meshStandardMaterial map={tex} metalness={0.7} roughness={0.3} />
        </mesh>
      )}
      <mesh geometry={geo} castShadow>{metal}</mesh>
      {fam.handles && [1, -1].map(side => (
        <mesh key={side} position={[side * 0.27, 0.56, 0]} rotation={[0, 0, side * 0.2]} castShadow>
          <torusGeometry args={[0.09, 0.016, 10, 24, Math.PI * 1.3]} />
          {metal}
        </mesh>
      ))}
      {fam.ring && (
        <mesh position={[0, 0.5, 0]} castShadow>
          <torusGeometry args={[0.24, 0.035, 16, 64]} />
          {metal}
        </mesh>
      )}
      {fam.orb && (
        <group position={[0, 0.58, 0]}>
          <mesh castShadow><sphereGeometry args={[0.24, 48, 32]} />{metal}</mesh>
          <mesh rotation={[0.4, 0, 0.3]}><torusGeometry args={[0.3, 0.012, 8, 64]} />{metal}</mesh>
          <mesh rotation={[-0.5, 0.2, -0.4]}><torusGeometry args={[0.32, 0.01, 8, 64]} />{metal}</mesh>
        </group>
      )}
    </group>
  );
}
