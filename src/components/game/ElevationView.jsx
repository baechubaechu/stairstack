import { useRef } from "react";
import {
  createClimberAnim,
  createDust,
  drawClimber,
  drawDust,
  puff,
  stepClimberAnim,
  stepDust,
} from "@/components/game/art/climber";
import { paintMember, shadeUnder } from "@/components/game/art/materials";
import {
  createEmbers,
  drawEmbers,
  drawGround,
  drawLava,
  drawLavaGlow,
  drawSky,
  stepEmbers,
} from "@/components/game/art/scene";
import { useFrame } from "@/components/game/frame";
import useCanvasSize from "@/components/game/useCanvasSize";
import { MONO, roundRect } from "@/lib/game/canvas";
import { CHARACTER, COMPASS, DROP_Y, EDGE_LINE, FACES, GROUND_HALF, LAVA_START } from "@/lib/game/constants";
import { faceU } from "@/lib/game/elevation";
import { ACCENT, ACCENT_SOFT, BLOCK, BLOCK_RGB, CLIMBER_GUIDE, INK, INK_SOFT, PAPER } from "@/lib/game/palette";

// Visible elevation window, in metres. It reaches just past the release height, so a
// dropping member is on screen from the top of its fall.
const VIEW = { xMin: -6.6, xMax: 6.6, yMin: -1.1, yMax: DROP_Y + 0.1 };
const SIDES = [-1, 1];
// The drafting grid, laid faintly over the sky so the sheet still reads as a drawing.
const SKY_GRID = "rgba(255,255,255,0.22)";

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

// A member landing hard kicks up dust where it struck. Tracked per member by the vertical
// speed it had last frame: falling fast, then suddenly not, is an impact.
function memberImpacts(eng, lastVy, dust) {
  const f = FACES[eng.face];
  for (const m of eng.members) {
    const vy = m.body.linvel().y;
    const prev = lastVy.get(m);
    lastVy.set(m, vy);
    if (prev === undefined || prev > -2.5 || vy < -0.6) continue;
    const t = m.body.translation();
    puff(dust, faceU(f, [t.x, t.y, t.z]), m.bottom ?? t.y - m.hy, m.hx * 1.6, 10);
  }
}

// ELEVATION — the silhouettes of the same rigid bodies, projected onto the face being read,
// set against the sky with the lava climbing beneath them.
export default function ElevationView({ engineRef }) {
  const canvasRef = useRef(null);
  const viewRef = useCanvasSize(canvasRef);
  const fx = useRef(null);

  useFrame((dt, now) => {
    const canvas = canvasRef.current;
    const view = viewRef.current;
    if (!canvas || !view) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { dpr, w, h } = view;
    if (!fx.current) {
      fx.current = { embers: createEmbers(), dust: createDust(), anim: createClimberAnim(), lastVy: new WeakMap() };
    }
    const { embers, dust, anim, lastVy } = fx.current;
    const t = now / 1000;

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
    const live = eng && eng.mode === "play" && !eng.stats().paused;
    // While the elevation turns, the plane collapses to a line and the projection from
    // the side being turned to opens up in its place.
    const turn = eng ? eng.turnView : null;
    const shown = turn
      ? turn.p < 0.5
        ? { id: turn.a, squash: 1 - 2 * turn.p }
        : { id: turn.b, squash: 2 * turn.p - 1 }
      : { id: eng ? eng.face : "front", squash: 1 };
    const proj = eng ? eng.viewFor(shown.id) : null;
    const lv = eng ? eng.lava : LAVA_START;

    // the effects only move while the run does, so a pause holds them too
    if (live) {
      stepEmbers(embers, dt, lv, VIEW);
      stepDust(dust, dt);
      if (!turn) memberImpacts(eng, lastVy, dust);
      const c = eng.character;
      if (stepClimberAnim(anim, c, dt)) puff(dust, c.x, c.y - c.hh, 0.3, 7);
    }

    // A face the climber could not step onto folds straight back. It takes a jolt and a red
    // wash, the spot that was taken is marked where it sits, and a banner names the face —
    // so the fold-back never reads as a turn that merely changed its mind.
    const info = eng ? eng.turnInfo : null;
    const jolt = info && info.back ? 1 : eng && eng.blockedView ? eng.blockedView.p : 0;
    const shake = jolt > 0 ? Math.sin(now / 34) * 5 * jolt : 0;

    // everything that belongs to the plane squashes with it — and jolts when it folds back
    const mid = w / 2;
    ctx.save();
    ctx.translate(shake, 0);
    ctx.save();
    ctx.translate(mid, 0);
    ctx.scale(Math.max(0.02, shown.squash), 1);
    ctx.translate(-mid, 0);

    drawSky(ctx, X, Y, VIEW, now);

    // 1 m grid, faint over the sky
    ctx.strokeStyle = SKY_GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = -6; gx <= 6; gx++) {
      ctx.moveTo(X(gx), Y(VIEW.yMax));
      ctx.lineTo(X(gx), Y(0));
    }
    for (let gy = 1; gy <= 8; gy++) {
      ctx.moveTo(X(VIEW.xMin), Y(gy));
      ctx.lineTo(X(VIEW.xMax), Y(gy));
    }
    ctx.stroke();

    drawGround(ctx, X, Y, VIEW, GROUND_HALF, INK);
    drawLavaGlow(ctx, X, Y, VIEW, lv);

    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let gy = 0; gy <= 8; gy += 2) haloText(ctx, `${gy} m`, X(-6) - 4, Y(gy));

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
      // shadows first, so no member's shadow falls across one in front of it
      for (const sil of proj.sil) shadeUnder(ctx, sil.poly, X, Y, scale);
      // every member keeps its own projected polygon — gaps stay open
      for (const sil of proj.sil) {
        if (sil.gate) {
          // a directional plate reads as one only once the climber's feet have found it:
          // pencilled before that, inked in the accent the moment they have stood on it
          paintMember(ctx, sil.poly, X, Y, {
            type: null,
            hex: sil.hex,
            scale,
            outline: sil.active ? ACCENT : INK_SOFT,
            dash: sil.active ? null : [4, 3],
          });
        } else {
          paintMember(ctx, sil.poly, X, Y, { type: sil.type, hex: sil.hex, screenAngle: -sil.angle, scale });
        }
      }

      // the member on its way down — drawn solid, dashed outline while it is in flight
      const act = proj.active;
      if (act && act.poly.length >= 3) {
        paintMember(ctx, act.poly, X, Y, { type: act.type, hex: act.hex, screenAngle: -act.angle, scale, dash: [6, 4] });
      }
    }

    // the lava rolls over whatever it has closed over, and throws embers up the window
    drawLava(ctx, X, Y, VIEW, lv, t);
    drawEmbers(ctx, embers, X, Y);
    ctx.font = `bold 10px ${MONO}`;
    ctx.fillStyle = "#fff4d6";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("LAVA", X(GROUND_HALF) - 4, Y(lv) + 6);

    if (proj) {
      drawDust(ctx, dust, X, Y, scale);

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

      drawClimber(ctx, X(c.x), Y(c.y - c.hh), scale, CHARACTER.h, anim, !c.grounded);
      ctx.font = `bold 10px ${MONO}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = INK;
      haloText(ctx, `${feet.toFixed(1)} m`, X(c.x) + CHARACTER.w * scale * 0.85, Y(c.y + c.hh * 0.2));
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
