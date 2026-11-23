import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { loft } from './geom';
import { helmetMap, suitMap } from './textures';
import type { Helmet } from '../types';

interface Props {
  primary: string;
  secondary: string;
  number: number;
  helmet: Helmet;
  pose?: 'stand' | 'celebrate' | 'spray';
  idle?: boolean;
  seg?: number;
}

/**
 * A stylised driver: race suit and helmet in team colours with the race number. No face and no
 * likeness; every driver shares the same build, only colours and numbers change.
 * Faces +z. Feet at y = 0, about 1.8 units tall.
 */
export function DriverFigure({ primary, secondary, number, helmet, pose = 'stand', idle = true, seg = 32 }: Props) {
  const root = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const torsoGeo = useMemo(() => {
    const g = loft([
      { x: 0.86, y: 0, w: 0.115, h: 0.165, n: 2.6 },
      { x: 1.0, y: 0, w: 0.12, h: 0.175, n: 2.6 },
      { x: 1.18, y: 0, w: 0.13, h: 0.2, n: 2.8 },
      { x: 1.34, y: 0, w: 0.125, h: 0.235, n: 3.4 },
      { x: 1.43, y: 0, w: 0.1, h: 0.17, n: 2.6 },
      { x: 1.5, y: 0, w: 0.06, h: 0.06, n: 2 },
    ], seg, 4, Math.PI);
    g.rotateZ(Math.PI / 2); // loft runs along x; stand it up
    // phase π puts the suit map's centre (chest number) at +z, the front
    return g;
  }, [seg]);
  const suit = useMemo(() => suitMap(primary, secondary, number), [primary, secondary, number]);
  const helmetTex = useMemo(() => helmetMap(helmet, number), [helmet, number]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (idle && root.current) {
      root.current.rotation.y = Math.sin(t * 0.6) * 0.06;
      root.current.position.y = Math.sin(t * 1.6) * 0.004;
    }
    if (pose === 'celebrate' && armL.current && armR.current) {
      armL.current.rotation.z = -2.5 - Math.sin(t * 5) * 0.15;
      armR.current.rotation.z = 2.5 + Math.sin(t * 5 + 1) * 0.15;
    }
  });

  const suitMat = <meshStandardMaterial color={primary} roughness={0.7} metalness={0.05} />;
  const dark = <meshStandardMaterial color="#141519" roughness={0.6} />;
  const armRot = pose === 'stand' ? 0.12 : pose === 'spray' ? 1.7 : 2.5;

  return (
    <group ref={root}>
      {/* boots */}
      {[-0.1, 0.1].map(x => (
        <mesh key={x} position={[x, 0.05, 0.04]} castShadow>
          <capsuleGeometry args={[0.055, 0.12, 6, 12]} />
          {dark}
        </mesh>
      ))}
      {/* legs */}
      {[-0.1, 0.1].map(x => (
        <group key={x}>
          <mesh position={[x, 0.32, 0]} castShadow><capsuleGeometry args={[0.072, 0.38, 6, 14]} />{suitMat}</mesh>
          <mesh position={[x * 0.96, 0.7, 0]} castShadow><capsuleGeometry args={[0.085, 0.34, 6, 14]} />{suitMat}</mesh>
        </group>
      ))}
      {/* pelvis: a flattened capsule bridging the legs and the torso */}
      <mesh position={[0, 0.88, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.72]} castShadow><capsuleGeometry args={[0.1, 0.13, 6, 16]} />{suitMat}</mesh>
      {/* torso */}
      <mesh geometry={torsoGeo} castShadow>
        <meshStandardMaterial map={suit} roughness={0.72} metalness={0.04} />
      </mesh>
      {/* arms, pivoting at the shoulders */}
      {[[-1, armL], [1, armR]].map(([side, ref]) => (
        <group key={side as number} ref={ref as React.RefObject<THREE.Group>} position={[(side as number) * 0.27, 1.37, -0.01]} rotation={[0, 0, (side as number) * armRot]}>
          <mesh position={[0, -0.17, 0]} castShadow><capsuleGeometry args={[0.058, 0.26, 6, 12]} />{suitMat}</mesh>
          <mesh position={[0, -0.44, pose === 'stand' ? 0.02 : 0]} castShadow><capsuleGeometry args={[0.05, 0.24, 6, 12]} />
            <meshStandardMaterial color={secondary} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.62, 0]} castShadow><sphereGeometry args={[0.058, 14, 12]} />{dark}</mesh>
        </group>
      ))}
      {/* HANS collar */}
      <mesh position={[0, 1.47, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.03, 8, 24, Math.PI * 1.4]} />
        {dark}
      </mesh>
      {/* helmet: shell, visor, chin */}
      <group position={[0, 1.64, 0.005]}>
        <mesh castShadow>
          <sphereGeometry args={[0.16, seg, Math.round(seg * 0.75)]} />
          <meshPhysicalMaterial map={helmetTex} roughness={0.22} clearcoat={1} clearcoatRoughness={0.04} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.164, seg, 12, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.36, Math.PI * 0.22]} />
          <meshPhysicalMaterial color="#0a0c11" roughness={0.04} metalness={0.7} clearcoat={1} />
        </mesh>
        <mesh position={[0, 0.16, -0.01]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.03, 0.012, 0.12]} />
          {dark}
        </mesh>
      </group>
    </group>
  );
}
