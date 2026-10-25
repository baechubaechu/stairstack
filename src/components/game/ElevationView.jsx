import { useRef } from "react";
import { breakPane, createShatter, drawShatter, stepShatter } from "@/components/game/art/shatter";
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
  drawLavaBelow,
  drawLavaGlow,
  drawSky,
  stepEmbers,
} from "@/components/game/art/scene";
import { useFrame } from "@/components/game/frame";
import useCanvasSize from "@/components/game/useCanvasSize";
import { MONO, roundRect } from "@/lib/game/canvas";
import {
  CHARACTER,

  DROP_Y,
  EDGE_LINE,
  FACES,
  GROUND_HALF,
  LAVA_START,
  VIEW_BOTTOM,
  VIEW_FOLLOW,
} from "@/lib/game/constants";
import { faceU, memberVertices } from "@/lib/game/elevation";
import { convexHull } from "@/lib/game/hull";
import { ACCENT, ACCENT_SOFT, BLOCK, BLOCK_RGB, CLIMBER_GUIDE, INK, INK_SOFT, PAPER } from "@/lib/game/palette";
import { t as tr } from "@/lib/i18n";
import { FALL_MAX } from "@/lib/game/constants";
import { sinkFactor } from "@/lib/game/survival";
import {
  createCraneFx,
  drawCrane,
  drawDroneHud,
  drawLastWords,
  drawRetract,
  drawSparks,
  drawSpeechBubble,
  drawThumbsUp,
  stepCraneFx,
} from "@/components/game/art/crane";
import { speaking } from "@/components/game/speech";

// Visible elevation window at the start of a run, in metres. It reaches just past the release
// height, so a dropping member is on screen from the top of its fall.
const BASE_VIEW = { xMin: -6.6, xMax: 6.6, yMin: VIEW_BOTTOM, yMax: DROP_Y + 0.1 };
const SIDES = [-1, 1];

// The window follows the climber up by the engine's viewRise (feet above VIEW_FOLLOW), the
// same rise members are released from — easing toward it over ~1/CAM_RATE s so a jump
// doesn't jerk the whole sheet.
const CAM_RATE = 4;
// The drafting grid, laid faintly over the sky so the sheet still reads as a drawing.
const SKY_GRID = "rgba(255,255,255,0.22)";
// The drone monitor's glass, around the picture where the window doesn't reach.
const SCREEN = "#101316";

// How badly the crane's brake is slipping: none at the start, all the way once members sink at
// their fastest — the same ramp that speeds them up (survival.js).
function strainOf(eng) {
  return Math.min(1, (sinkFactor(eng.stats().time) - 1) / (FALL_MAX - 1));
}

// The freeze-frame after a game over: the path the climber took over their last few seconds on
// this face, a pulsing ring where they went down, and — if a member came down on them — that
// member picked out in red.
function drawDeath(ctx, eng, X, Y, scale, time) {
  const d = eng.death;
  const pts = eng.trail.filter((p) => p.face === d.face);
  if (pts.length > 1) {
    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(${BLOCK_RGB},0.75)`;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.feet + 0.1)) : ctx.moveTo(X(p.x), Y(p.feet + 0.1))));
    ctx.stroke();
    ctx.restore();
  }
  if (d.killer >= 0 && eng.members[d.killer]) {
    const verts = memberVertices(eng.members[d.killer]);
    const f = FACES[d.face];
    const hull = convexHull(verts.map((v) => [faceU(f, v), v[1]]));
    ctx.save();
    ctx.beginPath();
    hull.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
    ctx.closePath();
    ctx.fillStyle = `rgba(${BLOCK_RGB},0.25)`;
    ctx.fill();
    ctx.strokeStyle = BLOCK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }
  const cx = X(d.x);
  const cy = Y(d.feet + CHARACTER.h / 2);
  const pulse = 0.5 + 0.5 * Math.sin(time * 5);
  ctx.save();
  ctx.strokeStyle = BLOCK;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(cx, cy, scale * (0.9 + 0.25 * pulse), 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.font = `bold 11px ${MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = BLOCK;
  haloText(ctx, tr("canvas.died"), cx, cy - scale * 1.25);
  ctx.restore();
}

// The tip forecast on the member in flight: a curved arrow over its end on side `dir` (+1 right,
// −1 left), sweeping out and down the way that end will go.
function drawTipArc(ctx, poly, X, Y, dir, scale) {
  const us = poly.map((p) => p[0]);
  const top = Math.max(...poly.map((p) => p[1]));
  const end = dir > 0 ? Math.max(...us) : Math.min(...us);
  const r = Math.max(14, 0.55 * scale);
  const x0 = X(end) - dir * r * 0.9;
  const y0 = Y(top) - r * 0.35;
  const x1 = X(end) + dir * r * 0.45;
  const y1 = Y(top) + r * 0.75;
  const cx = X(end) + dir * r * 0.35;
  const cy = Y(top) - r * 0.6;
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.fillStyle = ACCENT;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1 - 5);
  ctx.stroke();
  // the head, pointing along the curve's last stretch
  const a = Math.atan2(y1 - cy, x1 - cx);
  ctx.beginPath();
  ctx.moveTo(x1 + Math.cos(a) * 4, y1 + Math.sin(a) * 4);
  ctx.lineTo(x1 - Math.cos(a - 0.5) * 9, y1 - Math.sin(a - 0.5) * 9);
  ctx.lineTo(x1 - Math.cos(a + 0.5) * 9, y1 - Math.sin(a + 0.5) * 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

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
// `snapRef` is handed the canvas, so the game-over news can take its snapshot of the scene.
export default function ElevationView({ engineRef, snapRef }) {
  const canvasRef = useRef(null);
  if (snapRef) snapRef.current = canvasRef.current;
  const viewRef = useCanvasSize(canvasRef);
  const fx = useRef(null);

  useFrame((dt, now) => {
    const canvas = canvasRef.current;
    const size = viewRef.current;
    if (!canvas || !size) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { dpr, w, h } = size;
    if (!fx.current) {
      fx.current = {
        embers: createEmbers(),
        dust: createDust(),
        anim: createClimberAnim(),
        lastVy: new WeakMap(),
        camY: 0,
        crane: createCraneFx(),
      };
    }
    if (snapRef) snapRef.current = canvas;
    const { embers, dust, anim, lastVy, crane } = fx.current;
    const t = now / 1000;
    const eng = engineRef.current;

    // the camera: ease the window toward keeping the climber's feet in its lower third
    if (eng) {
      const target = Math.max(0, eng.character.y - eng.character.hh - VIEW_FOLLOW);
      fx.current.camY += (target - fx.current.camY) * (1 - Math.exp(-CAM_RATE * Math.min(dt, 0.1)));
    }
    const camY = fx.current.camY;
    const view = { ...BASE_VIEW, yMin: BASE_VIEW.yMin + camY, yMax: BASE_VIEW.yMax + camY };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // the monitor's dark glass around the picture
    ctx.fillStyle = SCREEN;
    ctx.fillRect(0, 0, w, h);

    const spanX = view.xMax - view.xMin;
    const spanY = view.yMax - view.yMin;
    const scale = Math.min(w / spanX, h / spanY);
    const ox = (w - spanX * scale) / 2;
    const oy = (h - spanY * scale) / 2;
    const X = (x) => ox + (x - view.xMin) * scale;
    const Y = (y) => oy + (view.yMax - y) * scale;
    // the drawn window, in canvas pixels — what the news photo is cropped to
    canvas.dataset.window = [X(view.xMin), Y(view.yMax), X(view.xMax) - X(view.xMin), Y(view.yMin) - Y(view.yMax)]
      .map((v) => Math.round(v * dpr))
      .join(",");
    // whole metres inside the window, for the grid and its height captions
    const gyMin = Math.ceil(view.yMin);
    const gyMax = Math.floor(view.yMax);

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
      stepEmbers(embers, dt, lv, view);
      stepDust(dust, dt);
      if (!turn) memberImpacts(eng, lastVy, dust);
      // glass shattering and pipe bundles bursting open, each burst of debris thrown once
      const seen = (fx.current.seenEffects ??= new Set());
      for (const ef of eng.effects) {
        if (seen.has(ef.id)) continue;
        seen.add(ef.id);
        const u = faceU(FACES[eng.face], [ef.x, ef.y, ef.z]);
        if (ef.kind === "shatter") breakPane((fx.current.glass ??= createShatter()), u, ef.y, ef.w, ef.hex);
        else puff(dust, u, ef.y, ef.w * 2, 16);
      }
      const c = eng.character;
      if (stepClimberAnim(anim, c, dt)) puff(dust, c.x, c.y - c.hh, 0.3, 7);
      stepCraneFx(crane, dt, strainOf(eng), crane.hook);
    }
    // the hook lets go: when a member is released it springs back up the window
    if (eng) {
      const dropped = eng.stats().dropped;
      if (crane.lastDropped != null && dropped > crane.lastDropped && crane.hook) {
        crane.retract = { u: crane.hook.u, y: crane.hook.y, t: 0 };
      }
      crane.lastDropped = dropped;
      if (!eng.death) crane.deathAt = null;
      else if (crane.deathAt == null) crane.deathAt = now;
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
    // nothing of the world spills past the window: once it has climbed, members below it and
    // falling ones above it are cut off at its edge instead of drawing over the margins
    ctx.beginPath();
    ctx.rect(X(view.xMin), Y(view.yMax), X(view.xMax) - X(view.xMin), Y(view.yMin) - Y(view.yMax));
    ctx.clip();

    drawSky(ctx, X, Y, view, now, camY);

    // 1 m grid, faint over the sky
    ctx.strokeStyle = SKY_GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = -6; gx <= 6; gx++) {
      ctx.moveTo(X(gx), Y(view.yMax));
      ctx.lineTo(X(gx), Y(Math.max(0, view.yMin)));
    }
    for (let gy = Math.max(1, gyMin); gy <= gyMax; gy++) {
      ctx.moveTo(X(view.xMin), Y(gy));
      ctx.lineTo(X(view.xMax), Y(gy));
    }
    ctx.stroke();

    drawGround(ctx, X, Y, BASE_VIEW.yMin, GROUND_HALF, INK);
    drawLavaGlow(ctx, X, Y, view, lv);

    // height captions every 2 m, wherever the window has climbed to
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let gy = Math.max(0, gyMin + (gyMin % 2 !== 0 ? 1 : 0)); gy <= gyMax; gy += 2) {
      haloText(ctx, `${gy} m`, X(-6) - 4, Y(gy));
    }

    // The two lines the view turns on: walk past one and the elevation changes face. Only a
    // walk held out of an end opens the turn, so the line is exactly where that happens.
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = ACCENT_SOFT;
    ctx.lineWidth = 1.5;
    const edgeTop = view.yMax - 0.7; // the arrowheads ride just under the top of the window
    ctx.beginPath();
    for (const s of SIDES) {
      ctx.moveTo(X(s * EDGE_LINE), Y(Math.max(0, view.yMin)));
      ctx.lineTo(X(s * EDGE_LINE), Y(edgeTop));
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = ACCENT;
    for (const s of SIDES) {
      ctx.beginPath();
      ctx.moveTo(X(s * EDGE_LINE) + s * 5, Y(edgeTop));
      ctx.lineTo(X(s * EDGE_LINE) - s * 3, Y(edgeTop) - 4);
      ctx.lineTo(X(s * EDGE_LINE) - s * 3, Y(edgeTop) + 4);
      ctx.closePath();
      ctx.fill();
    }

    if (proj) {
      // shadows first, so no member's shadow falls across one in front of it (a pencilled floor
      // slab isn't solid yet, so it throws none)
      for (const sil of proj.sil) if (!(sil.floor && !sil.active)) shadeUnder(ctx, sil.poly, X, Y, scale);
      // every member keeps its own projected polygon — gaps stay open — painted far to near, so
      // where two overlap on the monitor the one standing nearer the viewer is in front
      for (const sil of [...proj.sil].sort((a, b) => a.near - b.near)) {
        if (sil.floor && !sil.active) {
          // a floor slab nobody has stood on yet is pencilled in: faint, with a dashed edge,
          // so what falls through it and what stands under it still read
          ctx.save();
          ctx.globalAlpha = 0.38;
          paintMember(ctx, sil.poly, X, Y, { type: sil.type, hex: sil.hex, scale, outline: INK_SOFT, dash: [6, 4] });
          ctx.restore();
        } else {
          paintMember(ctx, sil.poly, X, Y, { type: sil.type, hex: sil.hex, screenAngle: -sil.angle, scale });
        }
      }

      // the member on its way down — drawn solid, dashed outline while it is in flight
      const act = proj.active;
      if (!act || act.poly.length < 3) crane.hook = null;
      drawRetract(ctx, X, Y, view, crane, scale);
      if (act && act.poly.length >= 3) {
        for (const poly of act.parts) paintMember(ctx, poly, X, Y, { type: act.type, hex: act.hex, screenAngle: -act.angle, scale, dash: [6, 4] });
        // it hangs from the crane — whose brake is going
        crane.hook = drawCrane(ctx, act.poly, X, Y, view, crane, t, strainOf(eng), scale);
        // If it will tip across this face, a curved arrow off the end that goes down. A tip
        // toward or away from the viewer doesn't show here; the plan's arrow has it.
        const tip = shown.squash === 1 ? eng.tipForecast() : null;
        const face = FACES[shown.id];
        if (tip && tip.axis === face.axis) drawTipArc(ctx, act.poly, X, Y, face.sign * tip.sign, scale);
      }
    }

    // the lava rolls over whatever it has closed over, and throws embers up the window
    drawLava(ctx, X, Y, view, lv, t);
    drawEmbers(ctx, embers, X, Y);
    drawSparks(ctx, crane, X, Y);
    if (eng) drawLavaBelow(ctx, X, Y, view, lv, eng.character.y - eng.character.hh, MONO);
    ctx.font = `bold 10px ${MONO}`;
    ctx.fillStyle = "#fff4d6";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(tr("canvas.lava"), X(GROUND_HALF) - 4, Y(lv) + 6);

    if (proj) {
      drawDust(ctx, dust, X, Y, scale);
      if (fx.current.glass) {
        stepShatter(fx.current.glass, dt);
        drawShatter(ctx, fx.current.glass, (u, y) => [X(u), Y(y)], scale);
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

      // Gone into the lava: they sink in, and a thumb comes back up through the surface.
      const sinking = eng.death && eng.death.cause === "lava" && crane.deathAt != null;
      const k = sinking ? (now - crane.deathAt) / 1000 : 0;
      if (sinking) {
        const down = Math.min(1, k / 1.3) * (CHARACTER.h + 0.15);
        ctx.save();
        ctx.beginPath();
        ctx.rect(X(view.xMin), Y(view.yMax), X(view.xMax) - X(view.xMin), Y(lv) - Y(view.yMax));
        ctx.clip();
        drawClimber(ctx, X(c.x), Y(c.y - c.hh - down), scale, CHARACTER.h, anim, false);
        ctx.restore();
        drawThumbsUp(ctx, X(c.x), Y(lv), scale, k);
        drawLastWords(ctx, X(c.x), Y(lv) - 0.45 * scale, tr("radio.illBeBack"), k);
      } else {
        drawClimber(ctx, X(c.x), Y(c.y - c.hh), scale, CHARACTER.h, anim, !c.grounded);
      }
      ctx.font = `bold 10px ${MONO}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = INK;
      if (!sinking) haloText(ctx, `${feet.toFixed(1)} m`, X(c.x) + CHARACTER.w * scale * 0.85, Y(c.y + c.hh * 0.2));

      if (eng.death && eng.death.cause === "head" && eng.death.face === shown.id) drawDeath(ctx, eng, X, Y, scale, t);

      // whatever the worker is saying, over their head
      const said = !sinking && speaking("worker");
      if (said) drawSpeechBubble(ctx, X(c.x), Y(c.y + c.hh + 0.15), said, X(view.xMin), X(view.xMax));
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
      ctx.fillText(tr("canvas.taken"), X(info.entry), by - 3);
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
      const face = tr(`face.${off ?? eng.face}`);
      const text = tr(info && info.back ? "canvas.blockedTurning" : "canvas.blockedTurned", { face });
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

    // the compass side each end of the view turns to — held crisp while the plane rotates, on
    // the ground line, or along the bottom of the window once it has climbed past the ground
    if (eng) {
      const f = FACES[eng.face];
      const at = Y(Math.max(0, view.yMin + 0.45)) - 7;
      ctx.font = `9px ${MONO}`;
      ctx.fillStyle = INK_SOFT;
      ctx.textBaseline = "bottom";
      ctx.textAlign = "left";
      haloText(ctx, `← ${tr(`compass.${FACES[f.left].compass}`)}`, X(-GROUND_HALF) + 4, at);
      ctx.textAlign = "right";
      haloText(ctx, `${tr(`compass.${FACES[f.right].compass}`)} →`, X(GROUND_HALF) - 4, at);
      ctx.textAlign = "left";
    }

    // the drone's camera overlay
    if (eng) {
      const s = eng.stats();
      drawDroneHud(ctx, w, h, {
        alt: Math.max(0, eng.character.y - eng.character.hh) + 3,
        battery: Math.max(0.12, 1 - s.time / 600),
        time: t,
        rec: s.mode === "play" && !s.over,
      });
    }
  });

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
