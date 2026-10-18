import { useEffect, useRef } from "react";
import { fitCanvas } from "@/lib/game/canvas";

// Keeps a canvas sized to its box. The returned ref holds { dpr, w, h } for the render loop
// to read each frame, so a resize never re-renders React.
export default function useCanvasSize(canvasRef) {
  const viewRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const resize = () => {
      viewRef.current = fitCanvas(canvas);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    return () => ro.disconnect();
  }, [canvasRef]);
  return viewRef;
}
