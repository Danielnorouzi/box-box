import { useMemo } from 'react';
import * as THREE from 'three';
import { loft, plate, rod, tyre, wing } from './geom';
import { carbon, helmetMap, numberDecal } from './textures';
import type { Helmet, TyreId } from '../types';
import { TYRES } from '../config/balance';

interface Props {
  primary: string;
  secondary: string;
  number: number;
  helmet: Helmet;
  tyre?: TyreId;
  seg?: number;
}

// Units ≈ metres. +x is forward, +y up, z across. Front axle x = 1.75, rear x = −1.85.
const FRONT_X = 1.75, REAR_X = -1.85, TRACK = 0.8;

function useGeometries(seg: number) {
  return useMemo(() => {
    const ring = Math.max(16, seg);
    const tub = loft([
      { x: 2.78, y: 0.2, w: 0.055, h: 0.04, n: 2.2 },
      { x: 2.45, y: 0.235, w: 0.11, h: 0.07, n: 2.4 },
      { x: 1.95, y: 0.3, w: 0.17, h: 0.11, n: 2.6 },
      { x: 1.35, y: 0.37, w: 0.25, h: 0.16, n: 2.8, bottomFlat: 0.25 },
      { x: 0.75, y: 0.42, w: 0.32, h: 0.2, n: 3, bottomFlat: 0.3 },
      { x: 0.15, y: 0.44, w: 0.36, h: 0.22, n: 3.2, bottomFlat: 0.3 },
      { x: -0.4, y: 0.45, w: 0.33, h: 0.24, n: 3.2, bottomFlat: 0.3 },
      { x: -1.05, y: 0.41, w: 0.22, h: 0.2, n: 2.8 },
      { x: -1.65, y: 0.35, w: 0.12, h: 0.13, n: 2.4 },
      { x: -2.05, y: 0.32, w: 0.06, h: 0.08, n: 2.2 },
    ], ring, 4);
    const cover = loft([
      { x: 0.05, y: 0.62, w: 0.1, h: 0.05, n: 2.2 },
      { x: -0.3, y: 0.72, w: 0.16, h: 0.14, n: 2.4 },
      { x: -0.7, y: 0.66, w: 0.15, h: 0.14, n: 2.4 },
      { x: -1.3, y: 0.53, w: 0.1, h: 0.1, n: 2.2 },
      { x: -1.85, y: 0.4, w: 0.04, h: 0.04, n: 2 },
    ], ring, 4);
    // Sidepods overlap the tub so they read as one sculpted body with a coke-bottle waist.
    const pod = loft([
      { x: 0.66, y: 0.29, w: 0.16, h: 0.12, n: 3.6, bottomFlat: 0.4 },
      { x: 0.4, y: 0.31, w: 0.27, h: 0.15, n: 3.8, bottomFlat: 0.4 },
      { x: -0.15, y: 0.3, w: 0.27, h: 0.15, n: 3.4, bottomFlat: 0.4 },
      { x: -0.8, y: 0.25, w: 0.17, h: 0.11, n: 2.8, bottomFlat: 0.3 },
      { x: -1.45, y: 0.2, w: 0.06, h: 0.05, n: 2.2 },
    ], ring, 4);
    const floor = plate([[1.15, 0.25], [0.9, 0.62], [0.4, 0.78], [-1.6, 0.78], [-1.95, 0.6], [-1.95, -0.6], [-1.6, -0.78], [0.4, -0.78], [0.9, -0.62], [1.15, -0.25]], 0.03);
    floor.rotateX(Math.PI / 2);
    const diffuser = plate([[-1.6, 0.55], [-2.2, 0.55], [-2.2, -0.55], [-1.6, -0.55]], 0.025);
    diffuser.rotateX(Math.PI / 2);
    const fin = plate([[-0.45, 0.86], [-1.7, 0.6], [-1.85, 0.45], [-0.9, 0.62]], 0.012);
    const fwMain = wing(0.36, 1.9, 0.07, 0.07);
    const fwFlap = wing(0.2, 1.6, 0.06, 0.09);
    const fwEnd = plate([[2.82, 0.05], [2.28, 0.05], [2.24, 0.26], [2.5, 0.3], [2.85, 0.16]], 0.014);
    const rwMain = wing(0.34, 1.02, 0.08, 0.1);
    const rwFlap = wing(0.18, 1.02, 0.06, 0.1);
    const rwEnd = plate([[-1.9, 0.42], [-2.42, 0.42], [-2.42, 1.0], [-2.0, 1.04], [-1.9, 0.86]], 0.014);
    const beam = wing(0.16, 0.9, 0.08, 0.05);
    const tf = tyre(0.36, 0.3, 0.24, ring + 8);
    const tr = tyre(0.37, 0.4, 0.24, ring + 8);
    const halo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      [-0.28, 0.66, 0.27], [-0.05, 0.8, 0.26], [0.25, 0.83, 0.17], [0.43, 0.82, 0], [0.25, 0.83, -0.17], [-0.05, 0.8, -0.26], [-0.28, 0.66, -0.27],
    ].map(p => new THREE.Vector3(...p))), 48, 0.028, 10);
    const pillar = rod([0.43, 0.82, 0], [0.66, 0.55, 0], 0.03);
    const arms: THREE.BufferGeometry[] = [];
    for (const side of [1, -1]) {
      for (const [x, chassisY, hubY] of [[FRONT_X, 0.42, 0.47], [FRONT_X, 0.3, 0.26], [REAR_X, 0.42, 0.48], [REAR_X, 0.28, 0.24]] as const) {
        arms.push(rod([x + 0.22, chassisY, side * 0.16], [x, hubY, side * (TRACK - 0.17)], 0.013));
        arms.push(rod([x - 0.22, chassisY, side * 0.16], [x, hubY, side * (TRACK - 0.17)], 0.013));
      }
      arms.push(rod([0.55, 0.6, side * 0.3], [0.6, 0.64, side * 0.45], 0.01));
    }
    return { tub, cover, pod, floor, diffuser, fin, fwMain, fwFlap, fwEnd, rwMain, rwFlap, rwEnd, beam, tf, tr, halo, pillar, arms };
  }, [seg]);
}

export function Car({ primary, secondary, number, helmet, tyre: compound = 'medium', seg = 40 }: Props) {
  const G = useGeometries(seg);
  const carbonTex = useMemo(() => carbon(), []);
  const helmetTex = useMemo(() => helmetMap(helmet, number), [helmet, number]);
  const num = useMemo(() => numberDecal(number, '#ffffff', 'rgba(0,0,0,0.6)'), [number]);
  const stripe = TYRES[compound].color;

  const paint = <meshPhysicalMaterial color={primary} metalness={0.25} roughness={0.28} clearcoat={1} clearcoatRoughness={0.08} />;
  const paint2 = <meshPhysicalMaterial color={secondary} metalness={0.25} roughness={0.3} clearcoat={1} clearcoatRoughness={0.1} />;
  const cf = <meshStandardMaterial map={carbonTex} color="#ffffff" roughness={0.45} metalness={0.35} />;
  const rubber = <meshStandardMaterial color="#121214" roughness={0.92} metalness={0} />;

  const wheel = (x: number, side: number, rear: boolean) => (
    <group key={`${x}${side}`} position={[x, rear ? 0.37 : 0.36, side * TRACK]}>
      <mesh geometry={rear ? G.tr : G.tf} castShadow>{rubber}</mesh>
      {/* compound band on the sidewall, like the real tyres */}
      <mesh position={[0, 0, side * (rear ? 0.19 : 0.145)]}>
        <torusGeometry args={[(rear ? 0.37 : 0.36) * 0.82, 0.012, 6, 48]} />
        <meshStandardMaterial color={stripe} roughness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, side * 0.02]}>
        <cylinderGeometry args={[0.235, 0.235, rear ? 0.34 : 0.26, 32]} />
        <meshStandardMaterial color="#2d3036" metalness={0.85} roughness={0.32} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, side * (rear ? 0.18 : 0.14)]}>
        <cylinderGeometry args={[0.05, 0.05, 0.03, 16]} />
        <meshStandardMaterial color={secondary} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );

  return (
    <group>
      <mesh geometry={G.tub} castShadow receiveShadow>{paint}</mesh>
      <mesh geometry={G.cover} castShadow>{paint}</mesh>
      <mesh geometry={G.fin} castShadow>{paint2}</mesh>
      {[1, -1].map(side => (
        <group key={side} position={[0, 0, side * 0.31]}>
          <mesh geometry={G.pod} castShadow>{paint}</mesh>
          {/* inlet mouth */}
          <mesh position={[0.67, 0.3, side * 0.06]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.2, 0.15]} />
            <meshStandardMaterial color="#050506" roughness={1} />
          </mesh>
        </group>
      ))}
      <mesh geometry={G.floor} position={[0, 0.07, 0]} castShadow receiveShadow>{cf}</mesh>
      <mesh geometry={G.diffuser} position={[0, 0.09, 0]} rotation={[0, 0, -0.16]}>{cf}</mesh>
      {/* cockpit opening and airbox mouth */}
      <mesh position={[0.08, 0.66, 0]} scale={[0.42, 0.05, 0.26]}>
        <sphereGeometry args={[1, 24, 12]} />
        <meshStandardMaterial color="#060607" roughness={1} />
      </mesh>
      <mesh position={[-0.16, 0.86, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.12, 0.1, 1]}>
        <circleGeometry args={[1, 24]} />
        <meshStandardMaterial color="#060607" roughness={1} />
      </mesh>
      {/* driver */}
      <mesh position={[0.02, 0.76, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <sphereGeometry args={[0.13, 32, 24]} />
        <meshPhysicalMaterial map={helmetTex} roughness={0.25} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>
      <mesh position={[0.06, 0.77, 0]} rotation={[0, Math.PI / 2, 0]}>
        <sphereGeometry args={[0.134, 32, 12, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.36, Math.PI * 0.2]} />
        <meshPhysicalMaterial color="#0b0d12" roughness={0.05} metalness={0.6} clearcoat={1} />
      </mesh>
      <mesh geometry={G.halo} castShadow>{cf}</mesh>
      <mesh geometry={G.pillar} castShadow>{cf}</mesh>
      {G.arms.map((g, i) => <mesh key={i} geometry={g}>{cf}</mesh>)}
      {/* mirrors */}
      {[1, -1].map(side => (
        <mesh key={side} position={[0.6, 0.65, side * 0.47]} castShadow>
          <boxGeometry args={[0.05, 0.05, 0.12]} />
          {paint}
        </mesh>
      ))}
      {/* front wing: main plane, flap, endplates */}
      <mesh geometry={G.fwMain} position={[2.55, 0.09, 0]} castShadow>{cf}</mesh>
      <mesh geometry={G.fwFlap} position={[2.4, 0.15, 0]} rotation={[0, 0, 0.26]} castShadow>{paint2}</mesh>
      {[1, -1].map(side => <mesh key={side} geometry={G.fwEnd} position={[0, 0, side * 0.95]} castShadow>{paint}</mesh>)}
      {/* rear wing */}
      <mesh geometry={G.rwMain} position={[-2.15, 0.84, 0]} rotation={[0, 0, -0.12]} castShadow>{paint}</mesh>
      <mesh geometry={G.rwFlap} position={[-2.06, 0.95, 0]} rotation={[0, 0, -0.4]} castShadow>{paint2}</mesh>
      <mesh geometry={G.beam} position={[-2.1, 0.46, 0]} castShadow>{cf}</mesh>
      {[1, -1].map(side => <mesh key={side} geometry={G.rwEnd} position={[0, 0, side * 0.52]} castShadow>{cf}</mesh>)}
      <mesh position={[-1.92, 0.62, 0]} castShadow><boxGeometry args={[0.06, 0.4, 0.05]} />{cf}</mesh>
      {/* number decals */}
      {[1, -1].map(side => (
        <mesh key={side} position={[-0.75, 0.68, side * 0.155]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[0.24, 0.24]} />
          <meshStandardMaterial map={num} transparent roughness={0.3} polygonOffset polygonOffsetFactor={-4} />
        </mesh>
      ))}
      {wheel(FRONT_X, 1, false)}
      {wheel(FRONT_X, -1, false)}
      {wheel(REAR_X, 1, true)}
      {wheel(REAR_X, -1, true)}
    </group>
  );
}
