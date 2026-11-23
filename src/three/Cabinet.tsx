import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Trophy } from './Trophy';
import type { Trophy as TrophyData } from '../store/derive';
import { useQuality } from './quality';

const PER_ROW = 4;
const CELL_W = 0.9, CELL_H = 1.25;

function Item({ t, x, y, selected, onSelect, reduce }: { t: TrophyData; x: number; y: number; selected: boolean; onSelect: () => void; reduce: boolean }) {
  const g = useRef<THREE.Group>(null);
  const q = useQuality();
  useFrame((_, dt) => {
    if (!g.current) return;
    const target = selected ? 1.18 : 1;
    g.current.scale.lerp(new THREE.Vector3(target, target, target), 1 - Math.exp(-dt * 8));
    if (selected && !reduce) g.current.rotation.y += dt * 0.9;
    else g.current.rotation.y += (0 - g.current.rotation.y) * (1 - Math.exp(-dt * 4));
  });
  const key = t.result?.roundId ?? `champ-${t.season}`;
  return (
    <group position={[x, y, 0]}>
      <group ref={g} onClick={e => { e.stopPropagation(); onSelect(); }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
        <Trophy shapeKey={key} position={t.position as 1 | 2 | 3} scale={0.95} champion={t.kind === 'champion'} seg={q.seg} />
      </group>
      {/* spotlight pool on the shelf */}
      <mesh position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.36, 32]} />
        <meshBasicMaterial color="#fff6e0" transparent opacity={selected ? 0.14 : 0.06} />
      </mesh>
    </group>
  );
}

/** A lit cabinet: dark lacquer frame, glass shelves, one bay per trophy. */
export function Cabinet({ items, selected, onSelect, reduce }: { items: TrophyData[]; selected: string | null; onSelect: (id: string) => void; reduce: boolean }) {
  const rows = Math.max(2, Math.ceil(items.length / PER_ROW));
  const W = PER_ROW * CELL_W + 0.3, H = rows * CELL_H + 0.2;
  const top = H / 2;
  return (
    <group position={[0, -0.1, 0]}>
      {/* back panel and frame */}
      <mesh position={[0, 0, -0.42]} receiveShadow>
        <boxGeometry args={[W, H, 0.04]} />
        <meshPhysicalMaterial color="#1b1712" roughness={0.55} clearcoat={0.4} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[(s * W) / 2, 0, 0]} castShadow>
          <boxGeometry args={[0.08, H + 0.08, 0.9]} />
          <meshPhysicalMaterial color="#0f0e0c" roughness={0.35} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>
      ))}
      {Array.from({ length: rows + 1 }, (_, r) => (
        <mesh key={r} position={[0, top - r * CELL_H - 0.02, 0]} receiveShadow>
          <boxGeometry args={[W, 0.035, 0.84]} />
          <meshPhysicalMaterial color="#d8e4ee" transmission={0.85} roughness={0.05} thickness={0.03} transparent opacity={0.6} />
        </mesh>
      ))}
      {items.map((t, i) => {
        const r = Math.floor(i / PER_ROW), c = i % PER_ROW;
        const x = -W / 2 + 0.15 + CELL_W * (c + 0.5);
        const y = top - (r + 1) * CELL_H + 0.2;
        return <Item key={t.id} t={t} x={x} y={y} selected={selected === t.id} onSelect={() => onSelect(t.id)} reduce={reduce} />;
      })}
      {/* bay lights */}
      {Array.from({ length: rows }, (_, r) => (
        <pointLight key={r} position={[0, top - r * CELL_H - 0.15, 0.3]} intensity={0.6} distance={2.4} color="#ffe9c4" />
      ))}
    </group>
  );
}

export const cabinetHeight = (n: number) => Math.max(2, Math.ceil(n / PER_ROW)) * CELL_H;
