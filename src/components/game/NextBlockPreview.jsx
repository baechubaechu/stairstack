import { useRef } from "react";
import { useFrame } from "@/components/game/frame";
import { fitCanvas } from "@/lib/game/canvas";
import { MEMBER_BY_ID, partsOf } from "@/lib/game/constants";
import { scaleHex } from "@/lib/game/palette";

// The eight corners of a box, and its six faces with their outward normals.
const CORNERS = [];
for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) CORNERS.push([sx, sy, sz]);
const FACES = [
  { idx: [0, 1, 3, 2], n: [-1, 0, 0] },
  { idx: [4, 5, 7, 6], n: [1, 0, 0] },
  { idx: [0, 1, 5, 4], n: [0, -1, 0] },
  { idx: [2, 3, 7, 6], n: [0, 1, 0] },
  { idx: [0, 2, 6, 4], n: [0, 0, -1] },
  { idx: [1, 3, 7, 5], n: [0, 0, 1] },
];
const PITCH = 0.5;
const LIGHT = [-0.45, 0.78, 0.44];

// The block that comes next, turning on the spot so its shape reads in three dimensions.
export default function NextBlockPreview({ typeId, className = "h-[46px] w-[46px]" }) {
  const canvasRef = useRef(null);
  const yawRef = useRef(0.7);

  useFrame((dt) => {
    const canvas = canvasRef.current;
    const type = MEMBER_BY_ID[typeId];
    if (!canvas || !type) return;
    const ctx = canvas.getContext("2d");
    yawRef.current += Math.min(dt, 0.05) * 0.9;
    const yaw = yawRef.current;

    const { dpr, w, h } = fitCanvas(canvas);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const hx = type.w / 2;
    const hy = type.h / 2;
    const hz = type.d / 2;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(PITCH);
    const sp = Math.sin(PITCH);
    const rot = (v) => {
      const x = v[0] * cy + v[2] * sy;
      const z = -v[0] * sy + v[2] * cy;
      return [x, v[1] * cp - z * sp, v[1] * sp + z * cp];
    };

    const scale = (Math.min(w, h) * 0.44) / Math.max(hx, hy, hz);
    const cx0 = w / 2;
    const cy0 = h / 2;
    // every face of every part (a member that is not a plain box is several), far ones first
    const faces = [];
    for (const p of partsOf(type)) {
      const pts = CORNERS.map((c) => {
        const r = rot([p.x + c[0] * p.hx, p.y + c[1] * p.hy, p.z + c[2] * p.hz]);
        return { x: cx0 + r[0] * scale, y: cy0 - r[1] * scale, z: r[2] };
      });
      for (const face of FACES) {
        const z = (pts[face.idx[0]].z + pts[face.idx[1]].z + pts[face.idx[2]].z + pts[face.idx[3]].z) / 4;
        faces.push({ face, pts, z });
      }
    }
    faces.sort((a, b) => a.z - b.z);

    for (const { face, pts } of faces) {
      const n = rot(face.n);
      const lit = 0.4 + 0.6 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
      ctx.beginPath();
      face.idx.forEach((k, j) => (j ? ctx.lineTo(pts[k].x, pts[k].y) : ctx.moveTo(pts[k].x, pts[k].y)));
      ctx.closePath();
      ctx.fillStyle = scaleHex(type.hex, lit);
      ctx.fill();
      ctx.strokeStyle = "rgba(6,10,13,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  return <canvas ref={canvasRef} className={`shrink-0 ${className}`} />;
}