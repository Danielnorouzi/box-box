import * as THREE from 'three';

/** A cross-section of a lofted body: centre (x along the car, y up), half width, half height, squareness. */
export interface Section { x: number; y: number; w: number; h: number; n?: number; bottomFlat?: number }

/**
 * Lofts superellipse cross-sections into a smooth closed body. The car's monocoque, sidepods and the
 * driver's torso are all built this way, which gives the tapering a box primitive can't.
 * x runs along the body; each ring lies in the y/z plane.
 */
export function loft(sections: Section[], seg = 28, smooth = 3, phase = 0): THREE.BufferGeometry {
  // Densify along the length with Catmull-Rom so the surface reads as one curve, not facets.
  const dense: Section[] = [];
  const at = (i: number) => sections[Math.max(0, Math.min(sections.length - 1, i))];
  for (let i = 0; i < sections.length - 1; i++) {
    for (let k = 0; k < smooth; k++) {
      const t = k / smooth;
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const cr = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
      dense.push({
        x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y),
        w: Math.max(0.001, cr(p0.w, p1.w, p2.w, p3.w)), h: Math.max(0.001, cr(p0.h, p1.h, p2.h, p3.h)),
        n: p1.n ?? 3, bottomFlat: p1.bottomFlat ?? 0,
      });
    }
  }
  dense.push(sections[sections.length - 1]);

  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  dense.forEach((s, i) => {
    const n = s.n ?? 3;
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2 + phase;
      const c = Math.cos(a), sn = Math.sin(a);
      // superellipse: |y/h|^n + |z/w|^n = 1
      let y = Math.sign(sn) * Math.abs(sn) ** (2 / n) * s.h;
      const z = Math.sign(c) * Math.abs(c) ** (2 / n) * s.w;
      if (s.bottomFlat && y < -s.h * (1 - s.bottomFlat)) y = -s.h * (1 - s.bottomFlat);
      pos.push(s.x, s.y + y, z);
      uv.push(i / (dense.length - 1), j / seg);
    }
  });
  const ring = seg + 1;
  for (let i = 0; i < dense.length - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * ring + j, b = a + ring;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  // Cap both ends.
  const capEnd = (i: number, flip: boolean) => {
    const s = dense[i];
    const centre = pos.length / 3;
    pos.push(s.x, s.y, 0);
    uv.push(i / (dense.length - 1), 0.5);
    for (let j = 0; j < seg; j++) {
      const a = i * ring + j;
      if (flip) idx.push(centre, a + 1, a); else idx.push(centre, a, a + 1);
    }
  };
  capEnd(0, true);
  capEnd(dense.length - 1, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A cambered aerofoil, extruded across the span (z). */
export function wing(chord: number, span: number, thick = 0.08, camber = 0.06): THREE.BufferGeometry {
  const sh = new THREE.Shape();
  const N = 16;
  const top: [number, number][] = [], bot: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const x = i / N;
    const t = 5 * thick * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
    const yc = camber * 4 * x * (1 - x);
    top.push([x * chord, (yc + t) * chord]);
    bot.push([x * chord, (yc - t) * chord]);
  }
  sh.moveTo(top[0][0], top[0][1]);
  top.slice(1).forEach(p => sh.lineTo(p[0], p[1]));
  bot.reverse().forEach(p => sh.lineTo(p[0], p[1]));
  const g = new THREE.ExtrudeGeometry(sh, { depth: span, bevelEnabled: false, curveSegments: 8 });
  g.translate(-chord / 2, 0, -span / 2);
  return g;
}

/** Tyre: a lathe of a rounded sidewall profile, so it bulges like rubber. */
export function tyre(radius: number, width: number, rimR: number, seg = 48): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const hw = width / 2;
  const shoulder = Math.min(hw, (radius - rimR) * 0.55);
  pts.push(new THREE.Vector2(rimR, -hw * 0.92));
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * (Math.PI / 2);
    pts.push(new THREE.Vector2(radius - shoulder + Math.cos(a) * shoulder, -hw + shoulder + Math.sin(a) * shoulder));
  }
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2);
    pts.push(new THREE.Vector2(radius - shoulder + Math.cos(a) * shoulder, hw - shoulder + Math.sin(a) * shoulder));
  }
  pts.push(new THREE.Vector2(rimR, hw * 0.92));
  const g = new THREE.LatheGeometry(pts, seg);
  g.rotateX(Math.PI / 2); // axle along z
  return g;
}

/** A thin rod from a to b (suspension arms, mirror stalks). */
export function rod(a: THREE.Vector3Tuple, b: THREE.Vector3Tuple, r = 0.012): THREE.BufferGeometry {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(r, r, len, 6);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  g.applyQuaternion(q);
  g.translate(va.x, va.y, va.z);
  return g;
}

/** Flat plate from a 2D outline (endplates, floor, fins), extruded thinly. */
export function plate(outline: [number, number][], thick: number): THREE.BufferGeometry {
  const sh = new THREE.Shape();
  sh.moveTo(outline[0][0], outline[0][1]);
  outline.slice(1).forEach(p => sh.lineTo(p[0], p[1]));
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false });
  g.translate(0, 0, -thick / 2);
  return g;
}
