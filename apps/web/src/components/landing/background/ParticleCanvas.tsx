"use client";

import { useEffect, useMemo, useRef } from "react";
import { useParticlePointer } from "@/hooks/useParticlePointer";
import { defaultParticleConfig, MAX_RIPPLES, resolveParticleConfig, RIPPLE_DURATION, type ParticleConfig } from "./particleConfig";
import { createParticleRenderer } from "./particleRenderer";
import { createParticleField, projectParticle, stepParticle, type Ripple } from "./particlePhysics";

const COLORS = ["#E14C19", "#FF6A2B", "#FF8A45"];

export default function ParticleCanvas({ config = defaultParticleConfig, animated = true }: { config?: Partial<ParticleConfig>; animated?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useParticlePointer(canvasRef);
  // Scalar dependencies support inline configuration without restarting animation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const settings = useMemo(() => resolveParticleConfig(config), [
    config.particleCount, config.particleSize, config.particleOpacity, config.waveSpeed,
    config.waveAmplitude, config.attractionRadius, config.attractionStrength,
    config.springStiffness, config.damping, config.rippleSpeed, config.rippleStrength,
    config.glowIntensity,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // A separate surface lets Canvas 2D take over after a context loss.
    const gpuCanvas = document.createElement("canvas");
    gpuCanvas.className = canvas.className;
    gpuCanvas.style.cssText = "position:absolute;inset:0;background:radial-gradient(ellipse at 8% 63%,#100603 0%,transparent 42%),radial-gradient(ellipse at 90% 62%,#100603,transparent 40%),#030303";
    const gpu = createParticleRenderer(gpuCanvas);
    if (gpu) canvas.after(gpuCanvas);
    let gpuActive = Boolean(gpu);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) { gpu?.dispose(); gpuCanvas.remove(); return; }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hardware = navigator as Navigator & { deviceMemory?: number };
    const lowPower = (hardware.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
    let width = 0;
    let height = 0;
    let field = createParticleField(0);
    let drawX = new Float32Array(0);
    let drawY = new Float32Array(0);
    let drawSize = new Float32Array(0);
    let drawNext = new Int32Array(0);
    const drawHeads = new Int32Array(COLORS.length * 16);
    let visible = true;
    const atmosphere = document.createElement("canvas");
    const sky = atmosphere.getContext("2d", { alpha: false })!;
    let sampleOrder = new Uint32Array(0);
    let frame = 0;
    let previous = 0;
    let time = 0;
    let slowFrames = 0;
    let samples = 0;
    let budget = 1;
    let pulseId = pointer.current.pulseId;
    const projected = new Float32Array(4);
    const ripples: Ripple[] = [];
    const sprites = COLORS.map(color => {
      const sprite = document.createElement("canvas");
      sprite.width = sprite.height = 32;
      const ctx = sprite.getContext("2d")!;
      const glow = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      glow.addColorStop(0, color);
      glow.addColorStop(0.16, color);
      glow.addColorStop(0.3, `${color}70`);
      glow.addColorStop(1, `${color}00`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 32, 32);
      return sprite;
    });

    const render = (now: number) => {
      frame = 0;
      const elapsed = previous ? (now - previous) / 1000 : 1 / 60;
      const dt = Math.min(1 / 30, elapsed);
      previous = now;
      // Disabling ambient drift keeps the terrain still while pointer attraction
      // and click ripples continue to animate. Reduced motion disables both.
      const moving = !motion.matches;
      if (moving && animated) time += dt;
      const state = pointer.current;
      if (state.pulseId !== pulseId) {
        pulseId = state.pulseId;
        if (moving) {
          if (ripples.length === MAX_RIPPLES) ripples.shift();
          ripples.push({ x: state.pulseX, y: state.pulseY, age: 0 });
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].age += Math.min(elapsed, RIPPLE_DURATION);
        if (ripples[i].age >= RIPPLE_DURATION) ripples.splice(i, 1);
      }
      context.globalAlpha = 1;
      if (!gpuActive) context.drawImage(atmosphere, 0, 0, width, height);
      state.glow += ((state.active && state.touch ? 1 : 0) - state.glow) * (1 - Math.exp(-dt * 9));
      if (state.glow > 0.01 && moving) {
        if (gpuActive) gpu!.point(state.x, state.y, 70, state.glow * 0.06, 1);
        else {
          context.globalAlpha = state.glow * 0.16;
          context.drawImage(sprites[1], state.x - 48, state.y - 48, 96, 96);
        }
      }
      const count = Math.floor(field.x.length * budget);
      drawHeads.fill(-1);
      for (let i = 0; i < count; i++) {
        const index = sampleOrder[i];
        projectParticle(field, index, time, width, height, settings, projected);
        const x = projected[0];
        const y = projected[1];
        if (moving && (ripples.length || state.active || field.offsetX[index] || field.offsetY[index])) {
          stepParticle(field, index, x, y, time, dt, state, ripples, settings);
        }
        const px = x + field.offsetX[index];
        const py = y + field.offsetY[index];
        if (px < -10 || px > width + 10 || py < -10 || py > height + 10) continue;
        const shimmer = 0.91 + Math.sin(time * 0.5 + field.phase[index]) * 0.09;
        const viewportFade = Math.min(1, Math.max(0, (height * 0.955 - py) / (height * 0.12)));
        const opacity = Math.min(1, settings.particleOpacity * field.light[index] * shimmer * viewportFade);
        if (opacity < 0.015) continue;
        const size = settings.particleSize * field.size[index];
        const color = field.tint[index];
        if (gpuActive) {
          gpu!.point(px, py, size * 1.38, opacity, color);
          continue;
        }
        if (settings.glowIntensity > 0 && color > 0 && field.phase[index] > (color === 2 ? 5.95 : 6.26)) {
          context.globalAlpha = opacity * settings.glowIntensity;
          const extent = size * (2 + settings.glowIntensity * 3);
          context.drawImage(sprites[color], px - extent / 2, py - extent / 2, extent, extent);
        }
        const bucket = color * 16 + Math.min(15, Math.floor(opacity * 16));
        drawX[index] = px;
        drawY[index] = py;
        drawSize[index] = size;
        drawNext[index] = drawHeads[bucket];
        drawHeads[bucket] = index;
      }
      if (gpuActive) gpu!.flush();
      // Shared paint state lets Canvas rasterize each group in one operation.
      for (let bucket = 0; bucket < drawHeads.length; bucket++) {
        if (drawHeads[bucket] === -1) continue;
        context.beginPath();
        for (let index = drawHeads[bucket]; index !== -1; index = drawNext[index]) {
          const size = drawSize[index];
          context.rect(drawX[index], drawY[index], size * 0.85, size * 0.85);
        }
        context.fillStyle = COLORS[Math.floor(bucket / 16)];
        context.globalAlpha = ((bucket % 16) + 0.5) / 16;
        context.fill();
      }
      if (moving && visible && !document.hidden) {
        // Sustained slow delivery reduces fill work without rebuilding arrays.
        samples++;
        if (elapsed > 0.024) slowFrames++;
        if (samples >= 45) {
          if (slowFrames > 27) budget = Math.max(0.35, budget * 0.8);
          slowFrames = samples = 0;
        }
        frame = requestAnimationFrame(render);
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      if (visible && !document.hidden) frame = requestAnimationFrame(render);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, lowPower || width < 700 ? 1.5 : 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const pixels = width * height;
      const density = Math.min(width < 600 ? 0.15 : width < 1024 ? 0.32 : 1,
        Math.max(0.075, pixels / 1800000)) * (lowPower ? 0.68 : 1);
      field = createParticleField(Math.floor(settings.particleCount * density * (gpuActive ? 1 : 0.6)), width / Math.max(1, height));
      if (gpuActive) {
        gpuCanvas.width = canvas.width;
        gpuCanvas.height = canvas.height;
        gpu!.resize(field.x.length, width, height, ratio, settings.glowIntensity);
      }
      // Stable shuffled prefixes preserve the active particles when the budget drops.
      sampleOrder = Uint32Array.from(field.x.keys());
      let seed = 1937;
      for (let i = sampleOrder.length - 1; i > 0; i--) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const j = Math.floor((seed / 4294967296) * (i + 1));
        const swap = sampleOrder[i];
        sampleOrder[i] = sampleOrder[j];
        sampleOrder[j] = swap;
      }
      atmosphere.width = Math.max(1, Math.round(width / 4));
      atmosphere.height = Math.max(1, Math.round(height / 4));
      sky.setTransform(atmosphere.width / width, 0, 0, atmosphere.height / height, 0, 0);
      sky.fillStyle = "#030303";
      sky.fillRect(0, 0, width, height);
      for (const [x, y] of [[0.08, 0.64], [0.90, 0.6]]) {
        const glow = sky.createRadialGradient(width * x, height * y, 0, width * x, height * y, Math.min(width * 0.34, height * 0.38));
        glow.addColorStop(0, "rgba(169,43,11,0.066)");
        glow.addColorStop(1, "rgba(169,43,11,0)");
        sky.fillStyle = glow;
        sky.fillRect(0, 0, width, height);
      }
      budget = 1;
      samples = slowFrames = 0;
      drawX = new Float32Array(field.x.length);
      drawY = new Float32Array(field.x.length);
      drawSize = new Float32Array(field.x.length);
      drawNext = new Int32Array(field.x.length);
      ripples.length = 0;
      schedule();
    };
    const changeMotion = () => {
      field.offsetX.fill(0);
      field.offsetY.fill(0);
      field.velocityX.fill(0);
      field.velocityY.fill(0);
      ripples.length = 0;
      schedule();
    };
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      schedule();
    });
    const contextLost = () => {
      gpuActive = false;
      gpuCanvas.remove();
      resize();
    };
    gpuCanvas.addEventListener("webglcontextlost", contextLost);
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    motion.addEventListener("change", changeMotion);
    resize();
    return () => {
      cancelAnimationFrame(frame);
      gpuCanvas.removeEventListener("webglcontextlost", contextLost);
      gpu?.dispose();
      gpuCanvas.remove();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", schedule);
      motion.removeEventListener("change", changeMotion);
    };
  }, [settings, pointer, animated]);

  return <canvas ref={canvasRef} className="block h-full w-full" />;
}
