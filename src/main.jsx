import { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";

const Game = lazy(() => import("@/components/game/Game"));

function Boot() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-paper px-6 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-[0.32em] text-foreground">STAIRSTACK</h1>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Starting physics world…</p>
    </div>
  );
}

// No StrictMode: its double-mount in dev would boot a second Rapier world.
createRoot(document.getElementById("root")).render(
  <Suspense fallback={<Boot />}>
    <Game />
  </Suspense>,
);
