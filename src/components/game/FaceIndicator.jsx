import { useEffect, useRef } from "react";
import { useFrame } from "@/components/game/frame";
import { ACCENT, BLOCK, BLOCK_RGB, GROUND, INK_FAINT, PAPER, edgeOf } from "@/lib/game/palette";

// The four faces in the order the tower turns through them: walking right walks on through
// this list, walking left walks back down it.
const ORDER = ["front", "right", "back", "left"];

// The tower as a block in three-quarter view. The face being read is always the one turned
// toward the viewer, so a turn swings the block a quarter turn — and a face that refuses the
// climber swings it out and straight back again.
const FACETS = [
  { n: [0, 0, 1], q: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] }, // front, facing +Z
  { n: [1, 0, 0], q: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] }, // right
  { n: [0, 0, -1], q: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] }, // back
  { n: [-1, 0, 0], q: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] }, // left
  { n: [0, 1, 0], q: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] }, // top
];

const HX = 0.85;
const HY = 0.66;
const HZ = 0.85;
const KX = 16; // px across
const KY = 16;
const KZ = 9; // px of depth shear
const SIZE = 62;

export default function FaceIndicator({ engineRef }) {
  const canvasRef = useRef(null);
  const dprRef = useRef(1);

  // a fixed-size canvas: its backing store is set once, at the screen's pixel density
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(SIZE * dpr);
    canvas.height = Math.round(SIZE * dpr);
    dprRef.current = dpr;
  }, []);

  useFrame(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const dpr = dprRef.current;
    const eng = engineRef.current;
    const info = eng ? eng.turnInfo : null;
    const from = ORDER.indexOf(eng ? eng.face : "front");
    let steps = 0;
    let phase = 0;
    if (info) {
      // the shortest way round: a turn is always one face, never three
      const d = (ORDER.indexOf(info.to) - from + 4) % 4;
      steps = d === 3 ? -1 : d;
      phase = info.back ? (info.p < 0.5 ? info.p * 2 : (1 - info.p) * 2) : info.p;
    }
    const jolt = info && info.back ? 1 : eng && eng.blockedView ? eng.blockedView.p : 0;
    const yaw = (-(from + steps * phase) * Math.PI) / 2;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const cx = SIZE / 2;
    const cy = SIZE / 2 - 3;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    if (jolt > 0) ctx.translate(Math.sin(performance.now() / 30) * 2.5 * jolt, 0);

    const faces = FACETS.map((f) => {
      const nz = -f.n[0] * sin + f.n[2] * cos;
      const quad = f.q.map(([x, y, z]) => {
        const wx = x * HX;
        const wz = z * HZ;
        const rx = wx * cos + wz * sin;
        const rz = -wx * sin + wz * cos;
        return { X: cx + rx * KX, Y: cy - y * HY * KY + rz * KZ, z: rz };
      });
      return { nz, quad, depth: (quad[0].z + quad[1].z + quad[2].z + quad[3].z) / 4, top: f.n[1] === 1 };
    });
    // the face turned toward the viewer is the one being read
    const facing = faces.reduce((a, b) => (b.nz > a.nz ? b : a), faces[0]);
    faces.sort((a, b) => a.depth - b.depth); // farthest first

    for (const f of faces) {
      if (!f.top && f.nz <= 0) continue; // a face turned away is hidden by the ones in front
      const read = f === facing;
      ctx.beginPath();
      ctx.moveTo(f.quad[0].X, f.quad[0].Y);
      for (let i = 1; i < 4; i++) ctx.lineTo(f.quad[i].X, f.quad[i].Y);
      ctx.closePath();
      ctx.fillStyle = read ? (jolt > 0 ? BLOCK : ACCENT) : f.top ? PAPER : GROUND;
      ctx.fill();
      ctx.strokeStyle = read ? edgeOf(jolt > 0 ? BLOCK : ACCENT) : INK_FAINT;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (jolt > 0) {
      ctx.fillStyle = `rgba(${BLOCK_RGB},${(0.16 * jolt).toFixed(3)})`;
      ctx.fillRect(0, 0, SIZE, SIZE);
    }
    ctx.restore();
  });

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      style={{ width: SIZE, height: SIZE }}
      className="block"
      aria-hidden="true"
    />
  );
}