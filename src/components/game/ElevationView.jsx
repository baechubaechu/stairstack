import { useRef } from "react";
import { useFrame } from "@/components/game/frame";
import useCanvasSize from "@/components/game/useCanvasSize";
import { MONO, roundRect, tracePoly } from "@/lib/game/canvas";
import { CHARACTER, COMPASS, DROP_Y, EDGE_LINE, FACES, GROUND_HALF, LAVA_START } from "@/lib/game/constants";
import {
  ACCENT,
  ACCENT_SOFT,
  BLOCK,
  BLOCK_RGB,
  CLIMBER_GUIDE,
  FIGURE,
  GRID,
  GROUND,
  INK,
  INK_SOFT,
  LAVA,
  LAVA_DEEP,
  LAVA_FILL,
  PAPER,
  edgeOf,
} from "@/lib/game/palette";

// Visible elevation window, in metres. It reaches just past the release height, so a
// dropping member is on screen from the top of its fall.
const VIEW = { xMin: -6.6, xMax: 6.6, yMin: -1.1, yMax: DROP_Y + 0.1 };
const SIDES = [-1, 1];

// Ink that stays readable wherever it lands: the lava floods the floor and the axis captions
// with it, so every label under the surface gets a paper-coloured halo first.
function haloText(ctx, text, x, y) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);
  ctx.restore();
  ctx.fillText(text, x, y);
}

// ELEVATION — the silhouettes of the same rigid bodies, projected onto the FRONT face.
export default function ElevationView({ engineRef }) {
  const canvasRef = useRef(null);
  const viewRef = useCanvasSize(canvasRef);

  useFrame(() => {
    const canvas = canvasRef.current;
    const view = viewRef.current;
    if (!canvas || !view) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { dpr, w, h } = view;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);

    const spanX = VIEW.xMax - VIEW.xMin;
    const spanY = VIEW.yMax - VIEW.yMin;
    const scale = Math.min(w / spanX, h / spanY);
    const ox = (w - spanX * scale) / 2;
    const oy = (h - spanY * scale) / 2;
    const X = (x) => ox + (x - VIEW.xMin) * scale;
    const Y = (y) => oy + (VIEW.yMax - y) * scale;

    const eng = engineRef.current;
    // While the elevation turns, the plane collapses to a line and the projection from
    // the side being turned to opens up in its place.
    const turn = eng ? eng.turnView : null;
    const shown = turn
      ? turn.p < 0.5
        ? { id: turn.a, squash: 1 - 2 * turn.p }
        : { id: turn.b, squash: 2 * turn.p - 1 }
      : { id: eng ? eng.face : "front", squash: 1 };
    const proj = eng ? eng.viewFor(shown.id) : null;

    // A face the climber could not step onto folds straight back. It takes a jolt and a red
    // wash, the spot that was taken is marked where it sits, and a banner names the face —
    // so the fold-back never reads as a turn that merely changed its mind.
    const info = eng ? eng.turnInfo : null;
    const jolt = info && info.back ? 1 : eng && eng.blockedView ? eng.blockedView.p : 0;
    const shake = jolt > 0 ? Math.sin(performance.now() / 34) * 5 * jolt : 0;

    // everything that belongs to the plane squashes with it — and jolts when it folds back
    const mid = w / 2;
    ctx.save();
    ctx.translate(shake, 0);
    ctx.save();
    ctx.translate(mid, 0);
    ctx.scale(Math.max(0.02, shown.squash), 1);
    ctx.translate(-mid, 0);

    // 1 m grid
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = -6; gx <= 6; gx++) {
      ctx.moveTo(X(gx), Y(VIEW.yMax));
      ctx.lineTo(X(gx), Y(VIEW.yMin));
    }
    for (let gy = 0; gy <= 8; gy++) {
      ctx.moveTo(X(VIEW.xMin), Y(gy));
      ctx.lineTo(X(VIEW.xMax), Y(gy));
    }
    ctx.stroke();

    // ground band
    ctx.fillStyle = GROUND;
    ctx.fillRect(X(-GROUND_HALF), Y(0), GROUND_HALF * 2 * scale, Y(VIEW.yMin) - Y(0));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(-GROUND_HALF), Y(0));
    ctx.lineTo(X(GROUND_HALF), Y(0));
    ctx.stroke();

    // The lava: a band from the foot of the window up to its surface, and it only ever climbs.
    // It floods the floor first, so the ground visibly goes under before the stack does.
    const lv = eng ? eng.lava : LAVA_START;
    const lavaBand = ctx.createLinearGradient(0, Y(lv), 0, Y(VIEW.yMin));
    lavaBand.addColorStop(0, LAVA_FILL);
    lavaBand.addColorStop(1, LAVA_DEEP);
    ctx.fillStyle = lavaBand;
    ctx.fillRect(X(VIEW.xMin), Y(lv), (VIEW.xMax - VIEW.xMin) * scale, Y(VIEW.yMin) - Y(lv));
    ctx.fillStyle = LAVA;
    ctx.fillRect(X(VIEW.xMin), Y(lv) - 1.5, (VIEW.xMax - VIEW.xMin) * scale, 1.5);
    ctx.font = `bold 10px ${MONO}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("LAVA", X(GROUND_HALF) - 4, Y(lv) - 4);

    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let gy = 0; gy <= 8; gy += 2) haloText(ctx, `${gy} m`, X(-6) - 4, Y(gy));
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let gx = -6; gx <= 6; gx += 2) haloText(ctx, `${gx}`, X(gx), Y(0) + 5);

    // The two lines the view turns on: walk past one and the elevation changes face. Only a
    // walk held out of an end opens the turn, so the line is exactly where that happens.
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = ACCENT_SOFT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const s of SIDES) {
      ctx.moveTo(X(s * EDGE_LINE), Y(0));
      ctx.lineTo(X(s * EDGE_LINE), Y(8));
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = ACCENT;
    for (const s of SIDES) {
      ctx.beginPath();
      ctx.moveTo(X(s * EDGE_LINE) + s * 5, Y(8));
      ctx.lineTo(X(s * EDGE_LINE) - s * 3, Y(8) - 4);
      ctx.lineTo(X(s * EDGE_LINE) - s * 3, Y(8) + 4);
      ctx.closePath();
      ctx.fill();
    }

    if (proj) {
      // every member keeps its own projected polygon — gaps stay open
      for (const sil of proj.sil) {
        if (sil.poly.length < 3) continue;
        tracePoly(ctx, sil.poly, X, Y);
        ctx.fillStyle = sil.hex;
        ctx.fill();
        if (sil.gate) {
          // a directional plate reads as one only once the climber's feet have found it:
          // pencilled before that, inked in the accent the moment they have stood on it
          ctx.setLineDash(sil.active ? [] : [4, 3]);
          ctx.strokeStyle = sil.active ? ACCENT : INK_SOFT;
          ctx.lineWidth = sil.active ? 2 : 1.3;
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = edgeOf(sil.hex);
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }
      }

      // the member on its way down — drawn solid, dashed outline while it is in flight
      const act = proj.active;
      if (act && act.poly.length >= 3) {
        tracePoly(ctx, act.poly, X, Y);
        ctx.fillStyle = act.hex;
        ctx.fill();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = edgeOf(act.hex);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // character height indicator
      const c = eng.character;
      const feet = Math.max(0, c.y - c.hh);
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = CLIMBER_GUIDE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(-GROUND_HALF), Y(feet));
      ctx.lineTo(X(c.x), Y(feet));
      ctx.stroke();
      ctx.restore();

      const wpx = CHARACTER.w * scale;
      const hpx = CHARACTER.h * scale;
      const bx = X(c.x - c.hw);
      const by = Y(c.y + c.hh);
      roundRect(ctx, bx, by, wpx, hpx, Math.min(4, wpx * 0.3));
      ctx.fillStyle = FIGURE;
      ctx.fill();
      ctx.strokeStyle = "rgba(18,24,30,0.6)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "rgba(244,241,236,0.9)";
      ctx.fillRect(bx + wpx * 0.18, by + hpx * 0.16, wpx * 0.64, Math.max(2, hpx * 0.11));
      ctx.fillStyle = FIGURE;
      ctx.fillRect(bx - 1.5, by + hpx - 2, wpx + 3, 2);
      ctx.fillStyle = INK;
      ctx.font = `bold 10px ${MONO}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${feet.toFixed(1)} m`, X(c.x) + wpx * 0.85, Y(c.y + c.hh * 0.2));
    }

    // the place the climber would have stepped onto on the face that turned them around —
    // marked where it sits, at their own height, so what was in the way is unmistakable
    if (info && info.back && turn && turn.p < 0.5 && eng) {
      const c = eng.character;
      const bw = (CHARACTER.w + 0.36) * scale;
      const bh = (CHARACTER.h + 0.36) * scale;
      const bx = X(info.entry) - bw / 2;
      const by = Y(Math.max(0, c.y - c.hh) + CHARACTER.h + 0.18);
      ctx.save();
      ctx.strokeStyle = BLOCK;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(bx + 3, by + 3);
      ctx.lineTo(bx + bw - 3, by + bh - 3);
      ctx.moveTo(bx + bw - 3, by + 3);
      ctx.lineTo(bx + 3, by + bh - 3);
      ctx.stroke();
      ctx.fillStyle = BLOCK;
      ctx.font = `bold 9px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("TAKEN", X(info.entry), by - 3);
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();

    // the wash and the banner: which face refused the climber, and which way the elevation
    // is going — held over the plane while the fold-back plays out
    if (jolt > 0) {
      ctx.fillStyle = `rgba(${BLOCK_RGB},${(0.11 * jolt).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      const off = info && info.back ? info.to : eng?.blockedView?.to;
      const label = FACES[off ?? eng.face].label;
      const text = `${label} FACE BLOCKED — ${info && info.back ? "TURNING BACK" : "TURNED BACK"}`;
      ctx.font = `bold 13px ${MONO}`;
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = BLOCK;
      roundRect(ctx, w / 2 - tw / 2 - 10, 10, tw + 20, 25, 5);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, w / 2, 22.5);
    }

    // the compass side each end of the view turns to — held crisp while the plane rotates
    if (eng) {
      const f = FACES[eng.face];
      ctx.font = `9px ${MONO}`;
      ctx.fillStyle = INK_SOFT;
      ctx.textBaseline = "bottom";
      ctx.textAlign = "left";
      haloText(ctx, `← ${COMPASS[FACES[f.left].compass]}`, X(-GROUND_HALF) + 4, Y(0) - 7);
      ctx.textAlign = "right";
      haloText(ctx, `${COMPASS[FACES[f.right].compass]} →`, X(GROUND_HALF) - 4, Y(0) - 7);
      ctx.textAlign = "left";
    }
  });

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
