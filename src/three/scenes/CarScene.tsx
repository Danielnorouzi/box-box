import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Stage } from '../Stage';
import { Car } from '../Car';
import { useQuality } from '../quality';
import type { Helmet, TyreId } from '../../types';

function Turntable({ children, spin }: { children: React.ReactNode; spin: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (spin && g.current) g.current.rotation.y += dt * 0.22; });
  return <group ref={g} rotation={[0, -0.75, 0]}>{children}</group>;
}

export default function CarScene({ primary, secondary, number, helmet, tyre = 'medium', spin, className }: {
  primary: string; secondary: string; number: number; helmet: Helmet; tyre?: TyreId; spin: boolean; className?: string;
}) {
  const q = useQuality();
  // Narrow screens: pull the camera back so the whole car fits the frame.
  const far = typeof window !== 'undefined' && window.innerWidth < 640 ? 1.45 : 1;
  return (
    <Stage camera={{ position: [5.4 * far, 2.1 * far, 5.9 * far], fov: 28, target: [0, 0.3, 0] }} shadowScale={9} className={className} label="Your car">
      <Turntable spin={spin}><group position={[0.15, 0, 0]}><Car primary={primary} secondary={secondary} number={number} helmet={helmet} tyre={tyre} seg={q.seg} /></group></Turntable>
    </Stage>
  );
}
