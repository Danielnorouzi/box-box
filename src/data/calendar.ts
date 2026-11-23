// 2026 calendar. Bahrain and Saudi Arabia were cancelled in March 2026 (Middle East conflict),
// leaving 22 Grands Prix. Dates are race day; `start` is the Friday of the weekend.
// Round numbers are left out on purpose: published sources disagree after the cancellations.
export interface Round {
  id: string; // stable key, e.g. "2026-qatar"
  name: string; // Grand Prix name
  trackId: string;
  start: string; // ISO date, first day of the weekend
  race: string; // ISO date of the Grand Prix
  sprint: boolean;
  cancelled?: boolean;
}

const r = (key: string, name: string, trackId: string, start: string, race: string, sprint = false, cancelled = false): Round =>
  ({ id: `2026-${key}`, name, trackId, start, race, sprint, cancelled });

export const CALENDAR: Round[] = [
  r('australia', 'Australian Grand Prix', 'au-1953', '2026-03-06', '2026-03-08'),
  r('china', 'Chinese Grand Prix', 'cn-2004', '2026-03-13', '2026-03-15', true),
  r('japan', 'Japanese Grand Prix', 'jp-1962', '2026-03-27', '2026-03-29'),
  r('bahrain', 'Bahrain Grand Prix', 'bh-2002', '2026-04-10', '2026-04-12', false, true),
  r('saudi', 'Saudi Arabian Grand Prix', 'sa-2021', '2026-04-17', '2026-04-19', false, true),
  r('miami', 'Miami Grand Prix', 'us-2022', '2026-05-01', '2026-05-03', true),
  r('canada', 'Canadian Grand Prix', 'ca-1978', '2026-05-22', '2026-05-24', true),
  r('monaco', 'Monaco Grand Prix', 'mc-1929', '2026-06-05', '2026-06-07'),
  r('barcelona', 'Barcelona-Catalunya Grand Prix', 'es-1991', '2026-06-12', '2026-06-14'),
  r('austria', 'Austrian Grand Prix', 'at-1969', '2026-06-26', '2026-06-28'),
  r('britain', 'British Grand Prix', 'gb-1948', '2026-07-03', '2026-07-05', true),
  r('belgium', 'Belgian Grand Prix', 'be-1925', '2026-07-17', '2026-07-19'),
  r('hungary', 'Hungarian Grand Prix', 'hu-1986', '2026-07-24', '2026-07-26'),
  r('netherlands', 'Dutch Grand Prix', 'nl-1948', '2026-08-21', '2026-08-23', true),
  r('italy', 'Italian Grand Prix', 'it-1922', '2026-09-04', '2026-09-06'),
  r('spain', 'Spanish Grand Prix', 'es-2026', '2026-09-11', '2026-09-13'),
  r('azerbaijan', 'Azerbaijan Grand Prix', 'az-2016', '2026-09-24', '2026-09-26'),
  r('singapore', 'Singapore Grand Prix', 'sg-2008', '2026-10-09', '2026-10-11', true),
  r('usa', 'United States Grand Prix', 'us-2012', '2026-10-23', '2026-10-25'),
  r('mexico', 'Mexico City Grand Prix', 'mx-1962', '2026-10-30', '2026-11-01'),
  r('brazil', 'São Paulo Grand Prix', 'br-1940', '2026-11-06', '2026-11-08'),
  r('lasvegas', 'Las Vegas Grand Prix', 'us-2023', '2026-11-19', '2026-11-21'),
  r('qatar', 'Qatar Grand Prix', 'qa-2004', '2026-11-27', '2026-11-29'),
  r('abudhabi', 'Abu Dhabi Grand Prix', 'ae-2009', '2026-12-04', '2026-12-06'),
];

export const RACES = CALENDAR.filter(x => !x.cancelled);
export const roundById = (id: string) => CALENDAR.find(x => x.id === id);

const day = (iso: string) => new Date(iso + 'T23:59:59').getTime();

/** The current weekend if one is on, else the next one, else the season finale. */
export function nextRound(now = Date.now()): Round {
  return RACES.find(x => day(x.race) >= now) ?? RACES[RACES.length - 1];
}

export function weekendLabel(x: Round) {
  const a = new Date(x.start + 'T12:00:00'), b = new Date(x.race + 'T12:00:00');
  const m = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' });
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${m(b)}`
    : `${a.getDate()} ${m(a)} – ${b.getDate()} ${m(b)}`;
}

export const isPast = (x: Round, now = Date.now()) => day(x.race) < now;
