import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { useQuality } from './quality';

/**
 * Shared studio for every 3D view: soft key light, built-in reflections (no HDR download, works offline),
 * a contact shadow, and quality tiers. Rendering pauses when the canvas scrolls off screen.
 */
export function Stage({ children, camera, shadowY = 0, shadowScale = 8, className, label, warm = false }: {
  children: ReactNode; camera: { position: [number, number, number]; fov: number; target?: [number, number, number] };
  shadowY?: number; shadowScale?: number; className?: string; label?: string; warm?: boolean;
}) {
  const q = useQuality();
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = wrap.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrap} className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        shadows={q.shadows}
        dpr={q.dpr}
        camera={{ position: camera.position, fov: camera.fov }}
        gl={{ antialias: q.tier === 'high', alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, camera: cam }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          cam.lookAt(...(camera.target ?? [0, 0, 0]));
        }}
      >
        <ambientLight intensity={0.18} />
        <directionalLight position={[4, 7, 5]} intensity={warm ? 1.4 : 1.7} castShadow={q.shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} color={warm ? '#fff1dc' : '#ffffff'} />
        <directionalLight position={[-5, 3, -4]} intensity={0.5} color="#9fb6ff" />
        <Environment resolution={q.envRes} frames={1}>
          <Lightformer intensity={2.4} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 4, 1]} />
          <Lightformer intensity={1.4} position={[6, 1.5, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 1.2, 1]} />
          <Lightformer intensity={1} position={[-6, 1.5, -2]} rotation={[0, Math.PI / 2, 0]} scale={[8, 1.2, 1]} />
          <Lightformer intensity={0.6} position={[0, 1, -6]} scale={[10, 2, 1]} color={warm ? '#ffcf8a' : '#cfe0ff'} />
        </Environment>
        {children}
        <ContactShadows position={[0, shadowY + 0.001, 0]} opacity={0.65} scale={shadowScale} blur={2.6} far={2.5} resolution={q.tier === 'high' ? 512 : 256} frames={q.tier === 'high' ? Infinity : 1} />
      </Canvas>
    </div>
  );
}
