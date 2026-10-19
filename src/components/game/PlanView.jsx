import { useEffect, useRef } from "react";
import { useFrame } from "@/components/game/frame";
import { paintMember } from "@/components/game/art/materials";
import { drawPlanLava } from "@/components/game/art/scene";
import drawGate from "@/components/game/drawGate";
import useCanvasSize from "@/components/game/useCanvasSize";
import { MONO, tracePoly } from "@/lib/game/canvas";
import { AIM_LIMIT, FACES, GROUND_HALF, ROTATE_STEP_DEG } from "@/lib/game/constants";
import {
  ACCENT,
  ACCENT_SOFT,
  ACCENT_TINT,
  CLIMBER_GUIDE,
  FIGURE,
  GRID,
  INK_FAINT,
  INK_SOFT,
  PAPER,
  PLATE,
  SHADOW,
  edgeOf,
} from "@/lib/game/palette";

// Visible plan window, in metres (world X across, world Z down).
const SPAN = 13.4;
// How far the strip of the face being read reaches into the plate.
const FACE_STRIP = 0.45;
const ROTATE_STEP = (ROTATE_STEP_DEG * Math.PI) / 180;
const clampAim = (v) => Math.max(-AIM_LIMIT, Math.min(AIM_LIMIT, v));

// TOP VIEW — a 2D plan of the same rigid bodies: X / Z footprints, depth Y collapsed. Each
// footprint throws a shadow that reaches further the higher the member sits, so the plan
// reads its own stacking order without a height label.
export default function PlanView({ engineRef, onDrop }) {
  const canvasRef = useRef(null);
  const viewRef = useCanvasSize(canvasRef);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    // Mouse position over the plan sets the member's X / Z placement.
    const aim = (e) => {
      const v = viewRef.current;
      const eng = engineRef.current;
      if (!v || !eng) return;
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(v.w / SPAN, v.h / SPAN);
      const ox = (v.w - SPAN * scale) / 2;
      const oy = (v.h - SPAN * scale) / 2;
      const x = (e.clientX - rect.left - ox) / scale - SPAN / 2;
      const z = (e.clientY - rect.top - oy) / scale - SPAN / 2;
      eng.preview.x = clampAim(x);
      eng.preview.z = clampAim(z);
    };

    const onMove = (e) => aim(e);
    const onDown = (e) => {
      if (e.button !== 0) return;
      aim(e);
      const eng = engineRef.current;
      if (eng && eng.drop()) onDropRef.current?.();
    };
    const onWheel = (e) => {
      e.preventDefault();
      const eng = engineRef.current;
      if (!eng || eng.mode !== "play") return;
      eng.preview.yaw += (e.deltaY > 0 ? -1 : 1) * ROTATE_STEP;
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [engineRef, viewRef]);

  useFrame((_dt, now) => {
    const canvas = canvasRef.current;
    const v = viewRef.current;
    if (!canvas || !v) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { dpr, w, h } = v;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);

    const scale = Math.min(w / SPAN, h / SPAN);
    const ox = (w - SPAN * scale) / 2;
    const oy = (h - SPAN * scale) / 2;
    const X = (x) => ox + (x + SPAN / 2) * scale;
    const Y = (z) => oy + (z + SPAN / 2) * scale;

    // the drawing board
    ctx.fillStyle = PLATE;
    ctx.fillRect(X(-GROUND_HALF), Y(-GROUND_HALF), GROUND_HALF * 2 * scale, GROUND_HALF * 2 * scale);

    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let g = -6; g <= 6; g++) {
      ctx.moveTo(X(g), Y(-GROUND_HALF));
      ctx.lineTo(X(g), Y(GROUND_HALF));
      ctx.moveTo(X(-GROUND_HALF), Y(g));
      ctx.lineTo(X(GROUND_HALF), Y(g));
    }
    ctx.stroke();

    ctx.strokeStyle = INK_FAINT;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(X(-GROUND_HALF), Y(-GROUND_HALF), GROUND_HALF * 2 * scale, GROUND_HALF * 2 * scale);

    // tick labels
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let g = -6; g <= 6; g += 2) ctx.fillText(`${g}`, X(g), Y(GROUND_HALF) + 4);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let g = -6; g <= 6; g += 2) ctx.fillText(`${g}`, X(-GROUND_HALF) - 5, Y(g));

    // Which elevation is being read — its plane inked along the very edge of the plate it
    // looks from, so the grid itself stays clear. The arrow outside it
    // shows which way that view's screen-x runs.
    const f = FACES[engineRef.current?.face ?? "front"];
    const band = 12 / scale; // how far outside the plate the band sits
    const reach = GROUND_HALF + 0.4; // it runs a little past both plate corners
    ctx.strokeStyle = ACCENT_SOFT;
    ctx.fillStyle = ACCENT_SOFT;
    ctx.lineWidth = 1;
    ctx.font = `9px ${MONO}`;

    if (f.axis === "x") {
      // a band above / below the plate; screen-x runs along +X or −X
      const z = f.sign > 0 ? GROUND_HALF + band : -GROUND_HALF - band;
      const a = X(-f.sign * reach);
      const b = X(f.sign * reach);
      const tip = f.sign > 0 ? b : a;
      const dir = f.sign > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(a, Y(z));
      ctx.lineTo(b, Y(z));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tip, Y(z));
      ctx.lineTo(tip - dir * 7, Y(z) - 4);
      ctx.lineTo(tip - dir * 7, Y(z) + 4);
      ctx.closePath();
      ctx.fill();
    } else {
      // a band beside the plate; screen-x runs along +Z or −Z
      const x = f.sign > 0 ? GROUND_HALF + band : -GROUND_HALF - band;
      const a = Y(-f.sign * reach);
      const b = Y(f.sign * reach);
      const tip = f.sign > 0 ? b : a;
      const dir = f.sign > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(X(x), a);
      ctx.lineTo(X(x), b);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(x), tip);
      ctx.lineTo(X(x) - 4, tip - dir * 7);
      ctx.lineTo(X(x) + 4, tip - dir * 7);
      ctx.closePath();
      ctx.fill();
    }

    // The face being read, shown as the surface it is: a tinted strip along the plate edge
    // the elevation looks in from, with that edge itself inked in. That edge is ±Z for the
    // front and back faces, and ±X for the two sides.
    const side = f.axis === "x" ? f.sign : -f.sign;
    ctx.fillStyle = ACCENT_TINT;
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2;
    if (f.axis === "x") {
      const z0 = side * GROUND_HALF;
      const zi = z0 - side * FACE_STRIP;
      ctx.fillRect(X(-GROUND_HALF), Math.min(Y(z0), Y(zi)), GROUND_HALF * 2 * scale, Math.abs(Y(zi) - Y(z0)));
      ctx.beginPath();
      ctx.moveTo(X(-GROUND_HALF), Y(z0));
      ctx.lineTo(X(GROUND_HALF), Y(z0));
      ctx.stroke();
    } else {
      const x0 = side * GROUND_HALF;
      const xi = x0 - side * FACE_STRIP;
      ctx.fillRect(Math.min(X(x0), X(xi)), Y(-GROUND_HALF), Math.abs(X(xi) - X(x0)), GROUND_HALF * 2 * scale);
      ctx.beginPath();
      ctx.moveTo(X(x0), Y(-GROUND_HALF));
      ctx.lineTo(X(x0), Y(GROUND_HALF));
      ctx.stroke();
    }

    // The compass every view is named by: north is up the plan, east to its right. The side
    // the elevation is being read from is the one picked out.
    const reading = FACES[engineRef.current?.face ?? "front"].compass;
    const inset = GROUND_HALF - 0.26;
    ctx.font = `bold 10px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const [c, px, py] of [
      ["N", 0, -inset],
      ["S", 0, inset],
      ["W", -inset, 0],
      ["E", inset, 0],
    ]) {
      ctx.fillStyle = c === reading ? ACCENT : INK_FAINT;
      ctx.fillText(c, X(px), Y(py));
    }

    const eng = engineRef.current;
    if (!eng) return;

    // footprints, lowest first, so a higher member sits over the ones beneath it
    const sorted = [...eng.plans].sort((a, b) => a.top - b.top);
    const stack = sorted.filter((p) => !p.stone);
    const k = scale / 52;

    // basalt is under the lava, so it goes down first and the lava washes over it
    for (const plan of sorted) {
      if (!plan.stone) continue;
      paintMember(ctx, plan.poly, X, Y, { type: "basalt", hex: plan.hex, scale, outline: edgeOf(plan.hex) });
    }

    // once the lava is over the floor, the whole plate is under it — the stack stands in it
    drawPlanLava(ctx, X, Y, GROUND_HALF, eng.lava, now / 1000);

    // shadows — the higher the member, the further its shadow reaches
    for (const plan of stack) {
      if (plan.poly.length < 3) continue;
      const off = 2.5 + 3.6 * plan.top;
      ctx.save();
      ctx.translate(off * k, (off + 1.6) * k);
      tracePoly(ctx, plan.poly, X, Y);
      ctx.fillStyle = `rgba(${SHADOW},${Math.min(0.3, 0.1 + 0.04 * plan.top).toFixed(3)})`;
      ctx.fill();
      ctx.restore();
    }

    // solid footprints in their materials — a plate nobody has stood on yet is only pencilled in
    for (const plan of stack) {
      if (plan.poly.length < 3) continue;
      ctx.save();
      if (plan.gate && !plan.gate.active) ctx.globalAlpha = 0.34;
      paintMember(ctx, plan.poly, X, Y, {
        type: plan.gate ? null : plan.type,
        hex: plan.hex,
        screenAngle: plan.angle,
        scale,
        outline: edgeOf(plan.hex),
      });
      ctx.restore();
    }

    // and every plate on the tower spells out which way it lets the climber out
    for (const plan of stack) if (plan.gate) drawGate(ctx, plan, X, Y);

    // the climber's column on the view being read — a wall that crosses the whole plate,
    // so the marker runs the full way across whichever axis that view measures
    const cw = eng.charWorld();
    const cf = FACES[eng.face];
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = CLIMBER_GUIDE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (cf.axis === "x") {
      ctx.moveTo(X(cw.cx), Y(-GROUND_HALF));
      ctx.lineTo(X(cw.cx), Y(GROUND_HALF));
    } else {
      ctx.moveTo(X(-GROUND_HALF), Y(cw.cz));
      ctx.lineTo(X(GROUND_HALF), Y(cw.cz));
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = FIGURE;
    if (cf.axis === "x") {
      ctx.fillRect(X(cw.cx) - 4, Y(-GROUND_HALF) - 3, 8, 3);
      ctx.fillRect(X(cw.cx) - 4, Y(GROUND_HALF), 8, 3);
    } else {
      ctx.fillRect(X(-GROUND_HALF) - 3, Y(cw.cz) - 4, 3, 8);
      ctx.fillRect(X(GROUND_HALF), Y(cw.cz) - 4, 3, 8);
    }

    // the member in play — its footprint, where the mouse has it
    if (eng.mode === "play") {
      const pl = eng.placement();
      ctx.save();
      ctx.translate(X(pl.x), Y(pl.z));
      ctx.rotate(-pl.yaw);
      const hw = (pl.type.w / 2) * scale;
      const hd = (pl.type.d / 2) * scale;
      ctx.beginPath();
      ctx.rect(-hw, -hd, hw * 2, hd * 2);
      ctx.fillStyle = ACCENT_TINT;
      ctx.fill();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(pl.x) - 5, Y(pl.z));
      ctx.lineTo(X(pl.x) + 5, Y(pl.z));
      ctx.moveTo(X(pl.x), Y(pl.z) - 5);
      ctx.lineTo(X(pl.x), Y(pl.z) + 5);
      ctx.stroke();
    }
  });

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-crosshair" />;
}
