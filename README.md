# Box Box

A personal F1-themed study app. Study is the car, the rest of your life is the driver.
Mobile-first PWA, also on desktop. Data model and rules: `PROPOSAL.md`. Every tuning number: `src/config/balance.ts`.

## Run

```bash
npm install
npm run dev             # http://localhost:5173 (also on your LAN for phone testing)
npm run build           # production build + service worker (installable, offline)
npm run build:artifact  # single-file preview build, no service worker
npm run balance:check   # simulates a typical player; prints hours to each milestone
node server/server.mjs  # optional sync server (PORT=8787, DATA_DIR=./server-data)
```
Add `?preview#car` (or `#driver`, `#trophy`, `#podium`, `#cabinet`) in dev to inspect 3D models alone.

## The loop

1. **Garage**: pick a 2026 Grand Prix and a lap count. Study minutes per lap = real lap seconds ÷ 30 (Spa ≈ 3.6 min, Monaco ≈ 2.5 min); total time shows before you start.
2. **Ticket**: a race ticket with the circuit's real grandstand names, gate, row, seat, serial, QR and hologram strip. Drag down the perforation to tear; the stub goes to the album.
3. **Practice** (optional, 5 min): write the session plan; it appears on the race screen.
4. **Qualifying** (optional, 5 min focus): sets your grid slot from car, driver and a clean lap. Leaving the app deletes the lap.
5. **Race**: top-down circuit, 22 rivals plus you, timing tower, sectors, gaps, tyre wear, team radio with sound and haptics.
   - **Tyres**: Soft/Medium/Hard set stint length and a credits multiplier; past the stint the pace falls off a cliff. 10+ lap dry races need one stop.
   - **Pit stop = break**: the field waits 5 minutes; longer and they race on.
   - **Leaving the app**: yellow flag; over 15 s is a strike; 3 strikes or 3 minutes away is a DNF (smoke, car coasts to a stop, DNF on the tower). Retire is two taps.
   - **Overtake Mode**: one charge per 3 clean laps, max 3 uses.
   - **Weather**: per-circuit rain chance; wet races are chaotic, use intermediates and pay +25% credits.
6. **Result**: classification, 25-18-15-12-10-8-6-4-2-1, credits breakdown; top three gets a 3D podium with champagne.

## Progression

- **Credits** (~1 per focused minute, plus finish, points, clean-race, wet and streak bonuses) fund **Car R&D**: Aero, Power Unit, Chassis, Reliability. Rising costs, diminishing returns, 9,000-credit season cap.
- **Driver** skills come from logged activities with daily caps: gym → Fitness, sleep → Consistency, reading → Racecraft, sport → Reflexes, swimming and wet races → Wet weather.
- **Contracts**: start at fictional Kestrel Racing; offers arrive from Cadillac, Haas, Alpine, Racing Bulls, Williams, Aston Martin, Audi, Mercedes, Red Bull, Ferrari and McLaren as hours and form improve. Team names only, no logos.
- Rivals develop through the season. Balance (simulated, 45-min races): first points ~3 h, first podium ~21 h, first win ~49 h, title fight ~170 h.

## Album

Ticket stubs, VIP passes (lanyard swing, hologram follows device tilt, unlocked by milestones), a 3D trophy cabinet (a shape per Grand Prix; tap to spin and see the race), stats and an 18-week heatmap.

## 3D

Procedural models built in code (`src/three/`): lofted car body, aerofoil wings, lathe tyres with compound bands, halo, livery and number decals; stylised drivers with helmet and suit textures and race numbers, no faces or likenesses; lathe-turned trophies; studio lighting with no downloads. Phones get a lighter tier (fewer segments, no shadow maps, capped pixel ratio); Settings can force either.

## Credits and notes

Circuit geometry: [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) (MIT). QR codes: qrcode-generator (MIT).
2026 car numbers and grandstand names are from memory and may need checking. Not affiliated with Formula 1; no official marks are used.
