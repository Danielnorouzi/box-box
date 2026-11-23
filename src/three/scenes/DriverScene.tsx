import { Stage } from '../Stage';
import { DriverFigure } from '../DriverFigure';
import { useQuality } from '../quality';
import type { Helmet } from '../../types';

export interface Fig { primary: string; secondary: string; number: number; helmet: Helmet }

/** One or two standing drivers. Used by driver select, the grid browser and your profile. */
export default function DriverScene({ figs, reduce, className, label }: { figs: Fig[]; reduce: boolean; className?: string; label?: string }) {
  const q = useQuality();
  const two = figs.length > 1;
  return (
    <Stage camera={{ position: [0, 1.25, two ? 4.2 : 3.4], fov: 32, target: [0, 1.0, 0] }} shadowScale={5} className={className} label={label}>
      {figs.map((f, i) => (
        <group key={i} position={[two ? (i ? 0.55 : -0.55) : 0, 0, 0]} rotation={[0, two ? (i ? -0.35 : 0.35) : 0.15, 0]}>
          <DriverFigure {...f} idle={!reduce} seg={q.seg} />
        </group>
      ))}
    </Stage>
  );
}
