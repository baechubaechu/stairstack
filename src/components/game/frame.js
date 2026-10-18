import { createContext, useContext, useEffect, useRef } from "react";

// The one animation loop. Game owns it: each frame it steps the engine, then calls every
// subscriber in mount order with (dt, now) — so every canvas draws the same engine state, and
// nothing runs a requestAnimationFrame of its own.
export const FrameContext = createContext(null);

// Run `callback(dt, now)` on every frame of the game loop, for as long as the component is
// mounted. The latest callback is always the one called, so it can close over fresh props.
export function useFrame(callback) {
  const subscribe = useContext(FrameContext);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  useEffect(() => subscribe((dt, now) => callbackRef.current(dt, now)), [subscribe]);
}
