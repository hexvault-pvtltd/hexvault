"use client";

import { useEffect, useMemo, useRef } from "react";
import { useParticlePointer } from "@/hooks/useParticlePointer";
import { defaultParticleConfig, MAX_RIPPLES, resolveParticleConfig, RIPPLE_DURATION, type ParticleConfig } from "./particleConfig";
import { createParticleField, projectParticle, stepParticle, type Ripple } from "./particlePhysics";

const COLORS = ["#A8320C", "#F46327", "#FF6A2B"];

export default function ParticleCanvas({ config = defaultParticleConfig }: { config?: Partial<ParticleConfig> }) {
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
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hardware = navigator as Navigator & { deviceMemory?: number };
    const lowPower = (hardware.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
    let width = 0;
    let height = 0;
    let field = createParticleField(0);
    let visible = true;
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
      if (!motion.matches) time += dt;
      const state = pointer.current;
      if (state.pulseId !== pulseId) {
        pulseId = state.pulseId;
        if (!motion.matches) {
          if (ripples.length === MAX_RIPPLES) ripples.shift();
          ripples.push({ x: state.pulseX, y: state.pulseY, age: 0 });
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].age += Math.min(elapsed, RIPPLE_DURATION);
        if (ripples[i].age >= RIPPLE_DURATION) ripples.splice(i, 1);
      }
      context.globalAlpha = 1;
      context.fillStyle = "#050505";
      context.fillRect(0, 0, width, height);
      state.glow += ((state.active && state.touch ? 1 : 0) - state.glow) * (1 - Math.exp(-dt * 9));
      if (state.glow > 0.01 && !motion.matches) {
        context.globalAlpha = state.glow * 0.16;
        context.drawImage(sprites[1], state.x - 48, state.y - 48, 96, 96);
      }
      const count = Math.floor(field.x.length * budget);
      for (let i = 0; i < count; i++) {
        const index = Math.floor(i / budget);
        projectParticle(field, index, time, width, height, settings, projected);
        const x = projected[0];
        const y = projected[1];
        if (!motion.matches) stepParticle(field, index, x, y, time, dt, state, ripples, settings);
        const px = x + field.offsetX[index];
        const py = y + field.offsetY[index];
        if (px < -10 || px > width + 10 || py < -10 || py > height + 10) continue;
        const depth = projected[2];
        const shimmer = 0.8 + Math.sin(time * 0.65 + field.phase[index]) * 0.2;
        const edgeFade = Math.min(1, Math.max(0, (height * 1.02 - py) / (height * 0.23)));
        const brightness = Math.min(1, 0.34 + depth * 0.4 + Math.max(0, projected[3]) * 1.6);
        context.globalAlpha = settings.particleOpacity * brightness * shimmer * edgeFade;
        const size = settings.particleSize * field.size[index] * Math.min(1.05, 0.48 + depth * 0.45);
        const color = brightness > 0.75 ? 2 : brightness > 0.44 ? 1 : 0;
        if (settings.glowIntensity > 0 && brightness > 0.47) {
          const extent = size * (2 + settings.glowIntensity * 3);
          context.drawImage(sprites[color], px - extent / 2, py - extent / 2, extent, extent);
        }
        context.fillStyle = COLORS[color];
        context.fillRect(px, py, size, size);
      }
      if (!motion.matches && visible && !document.hidden) {
        // Sustained slow delivery reduces fill work without rebuilding arrays.
        samples++;
        if (elapsed > 0.024) slowFrames++;
        if (samples >= 120) {
          if (slowFrames > 72) budget = Math.max(0.35, budget * 0.8);
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
      const density = Math.min(1, width * height / 1250000) * (width < 700 ? 0.65 : 1) * (lowPower ? 0.65 : 1);
      field = createParticleField(Math.floor(settings.particleCount * density));
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
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    motion.addEventListener("change", changeMotion);
    resize();
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", schedule);
      motion.removeEventListener("change", changeMotion);
    };
  }, [settings, pointer]);

  return <canvas ref={canvasRef} className="block h-full w-full" />;
}
