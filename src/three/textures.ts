import * as THREE from 'three';
import type { Helmet } from '../types';

const cache = new Map<string, THREE.Texture>();
const make = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  cache.set(key, t);
  return t;
};

const FONT = '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif';

/** Twill carbon weave, tiled. */
export const carbon = () => make('carbon', 64, 64, g => {
  g.fillStyle = '#141518'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const on = (x + y) % 2 === 0;
    const grd = g.createLinearGradient(x * 8, y * 8, x * 8 + 8, y * 8 + 8);
    grd.addColorStop(0, on ? '#24262b' : '#1a1b1f'); grd.addColorStop(1, on ? '#18191c' : '#26282d');
    g.fillStyle = grd; g.fillRect(x * 8, y * 8, 8, 8);
  }
}, [12, 12]);

/**
 * Helmet map for a sphere: canvas x is the angle around (front at u = 0.25), canvas y runs crown → chin.
 * Patterns are drawn in that space so they wrap correctly.
 */
export function helmetMap(h: Helmet, number: number) {
  const key = `helmet:${h.primary}:${h.secondary}:${h.accent}:${h.pattern}:${number}`;
  return make(key, 1024, 512, g => {
    const W = 1024, H = 512;
    g.fillStyle = h.primary; g.fillRect(0, 0, W, H);
    const front = W * 0.25, back = W * 0.75;
    g.fillStyle = h.secondary;
    switch (h.pattern) {
      case 'stripe':
        for (const cx of [front, back]) g.fillRect(cx - 46, 0, 92, H * 0.62);
        g.fillStyle = h.accent;
        for (const cx of [front, back]) { g.fillRect(cx - 58, 0, 8, H * 0.62); g.fillRect(cx + 50, 0, 8, H * 0.62); }
        break;
      case 'chevron':
        for (const cx of [0, W * 0.5, W]) {
          g.beginPath(); g.moveTo(cx - 170, H * 0.18); g.lineTo(cx, H * 0.48); g.lineTo(cx + 170, H * 0.18);
          g.lineTo(cx + 170, H * 0.3); g.lineTo(cx, H * 0.6); g.lineTo(cx - 170, H * 0.3); g.closePath(); g.fill();
        }
        g.fillStyle = h.accent; g.fillRect(0, H * 0.64, W, 10);
        break;
      case 'halo':
        g.fillRect(0, H * 0.3, W, H * 0.16);
        g.fillStyle = h.accent; g.fillRect(0, H * 0.27, W, 8); g.fillRect(0, H * 0.47, W, 8);
        g.fillStyle = h.secondary; g.beginPath(); g.arc(W / 2, 0, 110, 0, Math.PI); g.fill();
        break;
      case 'split':
        g.fillRect(front, 0, back - front, H);
        g.fillStyle = h.accent; g.fillRect(front - 6, 0, 12, H); g.fillRect(back - 6, 0, 12, H);
        break;
      case 'stars': {
        g.fillStyle = h.accent;
        const star = (x: number, y: number, r: number) => {
          g.beginPath();
          for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
          g.closePath(); g.fill();
        };
        let s = 7;
        const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
        for (let i = 0; i < 26; i++) star(rnd() * W, 40 + rnd() * H * 0.5, 14 + rnd() * 18);
        g.fillStyle = h.secondary; g.fillRect(0, H * 0.6, W, 26);
        break;
      }
    }
    // Number on both sides and on the crown at the back.
    g.font = `800 120px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const cx of [W * 0.02, W * 0.5, W * 0.98]) {
      g.lineWidth = 10; g.strokeStyle = h.primary; g.strokeText(String(number), cx, H * 0.5);
      g.fillStyle = h.accent; g.fillText(String(number), cx, H * 0.5);
    }
    // Chin bar darkens a touch, like a separate moulding.
    const chin = g.createLinearGradient(0, H * 0.72, 0, H);
    chin.addColorStop(0, 'rgba(0,0,0,0)'); chin.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = chin; g.fillRect(0, H * 0.72, W, H * 0.28);
  });
}

/** Race suit for a lofted torso: canvas x runs waist → collar, canvas y wraps around (front at the middle). */
export function suitMap(primary: string, secondary: string, number: number) {
  return make(`suit:${primary}:${secondary}:${number}`, 512, 512, g => {
    const W = 512, H = 512;
    g.fillStyle = primary; g.fillRect(0, 0, W, H);
    // side panels (left and right flanks at a quarter of the way round)
    g.fillStyle = secondary;
    for (const cy of [H * 0.25, H * 0.75]) g.fillRect(0, cy - 34, W * 0.92, 68);
    // belt
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(W * 0.04, 0, 26, H);
    // shoulder yoke
    g.fillStyle = secondary; g.fillRect(W * 0.84, 0, W * 0.16, H);
    // chest number, rotated because canvas x is "up" on the body
    g.save(); g.translate(W * 0.58, H * 0.5); g.rotate(Math.PI / 2);
    g.font = `800 96px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = secondary; g.strokeText(String(number), 0, 0);
    g.fillStyle = '#ffffff'; g.fillText(String(number), 0, 0);
    g.restore();
    // stitching lines for texture
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 2;
    for (let x = 40; x < W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  });
}

/** Race number decal with a transparent background, for the car's nose and engine cover. */
export function numberDecal(number: number, color: string, outline: string) {
  return make(`num:${number}:${color}:${outline}`, 256, 256, g => {
    g.font = `800 190px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 16; g.strokeStyle = outline; g.strokeText(String(number), 128, 136);
    g.fillStyle = color; g.fillText(String(number), 128, 136);
  });
}

/** Engraved plate for trophy bases. */
export function plaque(lines: string[], metal: string) {
  return make(`plaque:${lines.join('|')}:${metal}`, 512, 160, g => {
    const grd = g.createLinearGradient(0, 0, 512, 160);
    grd.addColorStop(0, metal); grd.addColorStop(0.5, '#ffffff'); grd.addColorStop(1, metal);
    g.fillStyle = grd; g.globalAlpha = 0.9; g.fillRect(0, 0, 512, 160); g.globalAlpha = 1;
    g.fillStyle = 'rgba(30,20,0,0.85)'; g.textAlign = 'center';
    g.font = `700 44px ${FONT}`; g.fillText(lines[0] ?? '', 256, 62);
    g.font = `500 32px ${FONT}`; g.fillText(lines[1] ?? '', 256, 112);
  });
}
