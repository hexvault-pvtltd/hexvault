"use client";

import { useEffect, useRef, type RefObject } from "react";

export interface ParticlePointer {
  x: number;
  y: number;
  active: boolean;
  touch: boolean;
  held: boolean;
  glow: number;
  pulseX: number;
  pulseY: number;
  pulseId: number;
}

export function useParticlePointer(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const pointer = useRef<ParticlePointer>({
    x: 0, y: 0, active: false, touch: false, held: false, glow: 0,
    pulseX: 0, pulseY: 0, pulseId: 0,
  });
  useEffect(() => {
    let activeId: number | null = null;
    let startX = 0;
    let startY = 0;
    let moved = false;
    const update = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const state = pointer.current;
      state.x = event.clientX - rect.left;
      state.y = event.clientY - rect.top;
      state.touch = event.pointerType === "touch";
      state.active = state.x >= 0 && state.x <= rect.width && state.y >= 0 && state.y <= rect.height;
      if (state.touch) state.active = state.active && activeId === event.pointerId;
    };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      activeId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      moved = false;
      update(event);
      pointer.current.held = pointer.current.active;
    };
    const move = (event: PointerEvent) => {
      update(event);
      if (event.pointerId === activeId && Math.hypot(event.clientX - startX, event.clientY - startY) > 12) moved = true;
    };
    const release = (event: PointerEvent) => {
      if (event.pointerId !== activeId) return;
      update(event);
      const state = pointer.current;
      if (!moved && state.active) {
        state.pulseX = state.x;
        state.pulseY = state.y;
        state.pulseId++;
      }
      state.held = false;
      if (state.touch) state.active = false;
      activeId = null;
    };
    const leave = () => {
      pointer.current.active = false;
      pointer.current.held = false;
      activeId = null;
    };
    const out = (event: PointerEvent) => { if (!event.relatedTarget) leave(); };
    const visibility = () => { if (document.hidden) leave(); };
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", leave, { passive: true });
    window.addEventListener("pointerout", out, { passive: true });
    window.addEventListener("blur", leave);
    window.addEventListener("scroll", leave, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", leave);
      window.removeEventListener("pointerout", out);
      window.removeEventListener("blur", leave);
      window.removeEventListener("scroll", leave);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [canvasRef]);
  return pointer;
}
