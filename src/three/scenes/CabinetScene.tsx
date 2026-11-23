import { Stage } from '../Stage';
import { Cabinet, cabinetHeight } from '../Cabinet';
import type { Trophy } from '../../store/derive';

export default function CabinetScene({ items, selected, onSelect, reduce }: { items: Trophy[]; selected: string | null; onSelect: (id: string) => void; reduce: boolean }) {
  const h = cabinetHeight(items.length);
  return (
    <Stage camera={{ position: [0, 0.2, 3.2 + h * 0.9], fov: 34, target: [0, 0, 0] }} warm shadowY={-h / 2 - 0.2} shadowScale={8} className="cabinet-canvas" label="Trophy cabinet">
      <Cabinet items={items} selected={selected} onSelect={onSelect} reduce={reduce} />
    </Stage>
  );
}
