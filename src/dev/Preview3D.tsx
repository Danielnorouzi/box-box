import { Stage } from '../three/Stage';
import { Car } from '../three/Car';
import { DriverFigure } from '../three/DriverFigure';
import { Trophy } from '../three/Trophy';
import type { Helmet } from '../types';
import { Podium } from '../three/Podium';
import { Cabinet } from '../three/Cabinet';

const H: Helmet = { primary: '#f3f3f3', secondary: '#1a5fd0', accent: '#ffd23f', pattern: 'stripe' };
export default function Preview3D() {
  const view = location.hash.slice(1);
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0d0f12' }}>
      {view === 'car' && <Stage camera={{ position: [5.6, 2.4, 6.2], fov: 30, target: [0, 0.35, 0] }} className="full"><group position={[0.2, 0, 0]}><Car primary="#1a5fd0" secondary="#7fd1ff" number={23} helmet={H} tyre="soft" /></group></Stage>}
      {view === 'car-top' && <Stage camera={{ position: [0.01, 7, 0.01], fov: 40 }} className="full"><Car primary="#e8102c" secondary="#f5d33c" number={16} helmet={H} /></Stage>}
      {view === 'driver' && <Stage camera={{ position: [0, 1.3, 3.6], fov: 32, target: [0, 1, 0] }} className="full"><group position={[-0.5, 0, 0]}><DriverFigure primary="#ff8a1f" secondary="#1b1f27" number={81} helmet={{ ...H, primary: '#ff8a1f', secondary: '#1b1f27', pattern: 'chevron' }} /></group><group position={[0.6, 0, 0]} rotation={[0, -0.6, 0]}><DriverFigure primary="#1a5fd0" secondary="#7fd1ff" number={23} helmet={H} /></group></Stage>}
      {view === 'trophy' && <Stage camera={{ position: [0, 0.7, 3.4], fov: 32, target: [0, 0.4, 0] }} warm className="full">{['2026-qatar', '2026-monaco', '2026-italy', '2026-japan', '2026-britain'].map((k, i) => <group key={k} position={[(i - 2) * 0.75, 0.1, 0]}><Trophy shapeKey={k} position={((i % 3) + 1) as 1 | 2 | 3} scale={0.9} lines={['Qatar GP', 'P1 · 2026']} /></group>)}</Stage>}
      {view === 'podium' && <Stage camera={{ position: [0, 2.1, 5.6], fov: 34, target: [0, 1.2, 0] }} warm shadowScale={10} className="full"><Podium reduce={false} drivers={[
        { primary: '#c8743c', secondary: '#f3e6d4', number: 9, helmet: H, you: true },
        { primary: '#ff8a1f', secondary: '#1b1f27', number: 1, helmet: { ...H, primary: '#ff8a1f' }, you: false },
        { primary: '#e8102c', secondary: '#f5d33c', number: 16, helmet: { ...H, primary: '#e8102c', pattern: 'halo' }, you: false }]} /></Stage>}
      {view === 'cabinet' && <Stage camera={{ position: [0, 0.2, 5.4], fov: 34 }} warm shadowY={-1.5} className="full"><Cabinet reduce={false} selected="a3" onSelect={() => {}} items={['2026-qatar','2026-monaco','2026-italy','2026-japan','2026-britain','2026-brazil'].map((r, i) => ({ id: 'a' + i, kind: 'podium' as const, position: ((i % 3) + 1) as 1 | 2 | 3, result: { roundId: r } as never })).concat([{ id: 'c', kind: 'champion', position: 1, season: 1 } as never])} /></Stage>}
    </div>
  );
}
