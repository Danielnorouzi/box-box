import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { useRef } from 'react';
import type { Group } from 'three';

// An original, simplified open-wheel racer built from primitives.
// Dimensions are loosely proportional (units ≈ 1 m): 5.4 long, 2.0 wide.
function Wheel({ x, z, r = 0.36, w = 0.38 }: { x: number; z: number; r?: number; w?: number }) {
  return (
    <group position={[x, r, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r, w, 32]} />
        <meshStandardMaterial color="#141416" roughness={0.85} />
      </mesh>
      <mesh position={[0, z > 0 ? w / 2 + 0.002 : -w / 2 - 0.002, 0]}>
        <cylinderGeometry args={[r * 0.62, r * 0.62, 0.01, 32]} />
        <meshStandardMaterial color="#3a3d44" metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Car({ color, spin }: { color: string; spin: boolean }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    if (spin && g.current) g.current.rotation.y += dt * 0.35;
  });
  const paint = <meshPhysicalMaterial color={color} metalness={0.35} roughness={0.32} clearcoat={1} clearcoatRoughness={0.15} />;
  const carbon = <meshStandardMaterial color="#17181b" roughness={0.55} metalness={0.2} />;
  return (
    <group ref={g} rotation={[0, -0.6, 0]}>
      {/* floor */}
      <mesh position={[0, 0.07, 0]} castShadow>
        <boxGeometry args={[3.6, 0.05, 1.5]} />
        {carbon}
      </mesh>
      {/* monocoque and engine cover */}
      <RoundedBox args={[2.6, 0.5, 0.7]} radius={0.2} position={[-0.1, 0.42, 0]} castShadow>{paint}</RoundedBox>
      <RoundedBox args={[1.4, 0.62, 0.5]} radius={0.22} position={[-0.95, 0.55, 0]} castShadow>{paint}</RoundedBox>
      {/* sidepods */}
      <RoundedBox args={[1.5, 0.36, 1.4]} radius={0.16} position={[-0.25, 0.3, 0]} castShadow>{paint}</RoundedBox>
      {/* nose */}
      <mesh position={[1.75, 0.32, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.22, 1.5, 24]} />
        {paint}
      </mesh>
      {/* front wing */}
      <mesh position={[2.35, 0.12, 0]} castShadow><boxGeometry args={[0.5, 0.04, 1.9]} />{carbon}</mesh>
      <mesh position={[2.25, 0.18, 0]} rotation={[0, 0, 0.18]} castShadow><boxGeometry args={[0.32, 0.03, 1.8]} /><meshPhysicalMaterial color={color} roughness={0.3} clearcoat={1} /></mesh>
      {[-0.96, 0.96].map(z => (
        <mesh key={z} position={[2.35, 0.2, z]} castShadow><boxGeometry args={[0.55, 0.2, 0.03]} />{carbon}</mesh>
      ))}
      {/* rear wing */}
      <mesh position={[-2.05, 0.95, 0]} rotation={[0, 0, -0.12]} castShadow><boxGeometry args={[0.42, 0.05, 1.1]} />{paint}</mesh>
      <mesh position={[-2.0, 1.07, 0]} rotation={[0, 0, -0.2]} castShadow><boxGeometry args={[0.2, 0.03, 1.1]} />{carbon}</mesh>
      {[-0.56, 0.56].map(z => (
        <mesh key={z} position={[-2.05, 0.8, z]} castShadow><boxGeometry args={[0.6, 0.6, 0.03]} />{carbon}</mesh>
      ))}
      <mesh position={[-1.9, 0.55, 0]} castShadow><boxGeometry args={[0.08, 0.5, 0.08]} />{carbon}</mesh>
      {/* halo and helmet */}
      <mesh position={[0.15, 0.82, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.28, 0.035, 12, 32, Math.PI]} />
        {carbon}
      </mesh>
      <mesh position={[0.05, 0.76, 0]} castShadow>
        <sphereGeometry args={[0.15, 24, 16]} />
        <meshPhysicalMaterial color="#f4f4f4" roughness={0.2} clearcoat={1} />
      </mesh>
      {/* suspension arms */}
      {[[1.45, 0.62], [1.45, -0.62], [-1.5, 0.62], [-1.5, -0.62]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.36, z / 1.1]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.04, 0.03, 0.55]} />
          {carbon}
        </mesh>
      ))}
      <Wheel x={1.5} z={0.86} r={0.34} w={0.32} />
      <Wheel x={1.5} z={-0.86} r={0.34} w={0.32} />
      <Wheel x={-1.55} z={0.84} r={0.37} w={0.42} />
      <Wheel x={-1.55} z={-0.84} r={0.37} w={0.42} />
    </group>
  );
}

export default function Car3D({ color, spin }: { color: string; spin: boolean }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [4.4, 2.3, 5.2], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      aria-hidden
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      {/* Studio reflections built in code: no HDR download, works offline. */}
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 3, 1]} />
        <Lightformer intensity={1.2} position={[5, 1, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 1.5, 1]} />
        <Lightformer intensity={0.8} position={[-5, 1, -2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 1.5, 1]} />
      </Environment>
      <group position={[0.1, -0.55, 0]}>
        <Car color={color} spin={spin} />
        <ContactShadows position={[0, 0.001, 0]} opacity={0.6} scale={9} blur={2.4} far={2} />
      </group>
    </Canvas>
  );
}
