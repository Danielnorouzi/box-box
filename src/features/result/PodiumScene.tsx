import { Stage } from '../../three/Stage';
import { Podium, type PodiumDriver } from '../../three/Podium';

export default function PodiumScene({ drivers, reduce }: { drivers: [PodiumDriver, PodiumDriver, PodiumDriver]; reduce: boolean }) {
  return (
    <Stage camera={{ position: [0, 2.1, 5.6], fov: 34, target: [0, 1.2, 0] }} warm shadowScale={10} className="podium-canvas">
      <Podium drivers={drivers} reduce={reduce} />
    </Stage>
  );
}
