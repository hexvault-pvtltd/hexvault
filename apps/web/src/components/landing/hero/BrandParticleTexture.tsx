"use client";

import { useEffect, useRef } from "react";
import { brandTypographyConfig as config } from "./brandTypographyConfig";

export default function BrandParticleTexture() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const mask = document.createElement("canvas");
    const base = document.createElement("canvas");
    const texture = document.createElement("canvas");
    const bloom = document.createElement("canvas");
    const maskContext = mask.getContext("2d")!;
    const baseContext = base.getContext("2d")!;
    const textureContext = texture.getContext("2d")!;
    const bloomContext = bloom.getContext("2d")!;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let inkTop = 0;
    let inkHeight = 1;
    let ratio = 1;
    let frame = 0;
    let previous = 0;
    let time = 0;
    let visible = true;
    let disposed = false;
    let fontReady = false;
    let positions = new Float32Array(0);
    let phases = new Float32Array(0);
    let sizes = new Float32Array(0);
    let opacities = new Float32Array(0);
    let animatedX = new Float32Array(0);
    let animatedY = new Float32Array(0);
    let drawNext = new Int32Array(0);
    const drawHeads = new Int32Array(32);

    const render = (now: number) => {
      frame = 0;
      if (!visible || document.hidden || disposed) return;
      const elapsed = previous ? now - previous : 0;
      if (!motion.matches && previous && elapsed < 1000 / config.framesPerSecond - 1) {
        frame = requestAnimationFrame(render);
        return;
      }
      if (!motion.matches) time += Math.min(elapsed / 1000, 0.06);
      previous = now;
      textureContext.clearRect(0, 0, width, height);
      textureContext.globalCompositeOperation = "source-over";
      textureContext.globalAlpha = 1;
      textureContext.drawImage(base, 0, 0, width, height);
      drawHeads.fill(-1);
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        const drift = time * config.animationSpeed;
        const x = positions[i * 2] + Math.sin(drift + phase) * config.movementAmplitude;
        const y = positions[i * 2 + 1] + Math.cos(drift * 0.73 + phase) * config.movementAmplitude;
        const fade = Math.max(0, 1 - (y - inkTop) / inkHeight) ** 1.2;
        const opacity = opacities[i] * (0.86 + Math.sin(drift * 1.3 + phase) * 0.14) * fade;
        if (opacity < 0.015) continue;
        const bucket = (i % 4 === 0 ? 16 : 0) + Math.min(15, Math.floor(opacity * 16));
        animatedX[i] = x;
        animatedY[i] = y;
        drawNext[i] = drawHeads[bucket];
        drawHeads[bucket] = i;
      }
      for (let bucket = 0; bucket < drawHeads.length; bucket++) {
        if (drawHeads[bucket] === -1) continue;
        textureContext.beginPath();
        for (let i = drawHeads[bucket]; i !== -1; i = drawNext[i]) {
          textureContext.rect(animatedX[i], animatedY[i], sizes[i], sizes[i]);
        }
        textureContext.globalAlpha = ((bucket % 16) + 0.5) / 16;
        textureContext.fillStyle = bucket >= 16 ? "#FF8A45" : "#FF6A2B";
        textureContext.fill();
      }
      // Keep the moving core inside its eroded silhouette.
      textureContext.globalAlpha = 1;
      textureContext.globalCompositeOperation = "destination-in";
      textureContext.drawImage(mask, 0, 0, width, height);
      context.clearRect(0, 0, width, height);
      context.drawImage(bloom, 0, 0, width, height);
      context.drawImage(texture, 0, 0, width, height);
      if (!motion.matches) frame = requestAnimationFrame(render);
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      if (fontReady && visible && !document.hidden && !disposed) frame = requestAnimationFrame(render);
    };

    const resize = () => {
      if (!fontReady || disposed) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) return;
      ratio = Math.min(window.devicePixelRatio || 1, config.maxPixelRatio);
      for (const surface of [canvas, mask, base, texture, bloom]) {
        surface.width = Math.max(1, Math.round(width * ratio));
        surface.height = Math.max(1, Math.round(height * ratio));
        surface.getContext("2d")!.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      const fontFamily = getComputedStyle(canvas).getPropertyValue("--font-brand").trim();
      const setFont = (size: number) => {
        maskContext.font = `${config.fontWeight} ${size}px ${fontFamily}`;
        maskContext.letterSpacing = `${size * config.letterSpacing}px`;
      };
      const spread = window.innerWidth * 0.04;
      const padding = Math.max(2, (width - spread) * 0.008);
      setFont(100);
      const measured = maskContext.measureText(config.text);
      const inkWidth = measured.actualBoundingBoxLeft + measured.actualBoundingBoxRight;
      const size = Math.min(
        (width - spread - padding * 2) / (inkWidth * config.widthScale) * 100,
        (height - spread * 2 - padding * 2) / (measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent) * 100,
      );
      setFont(size);
      const metrics = maskContext.measureText(config.text);
      const textWidth = (metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) * config.widthScale;
      const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      const left = (width - textWidth) / 2;
      const top = (height - textHeight) / 2;
      inkTop = top;
      inkHeight = textHeight;
      maskContext.save();
      maskContext.translate(left + metrics.actualBoundingBoxLeft * config.widthScale, top + metrics.actualBoundingBoxAscent);
      maskContext.scale(config.widthScale, 1);
      maskContext.fillStyle = "#fff";
      maskContext.fillText(config.text, 0, 0);
      maskContext.restore();

      const gradient = baseContext.createLinearGradient(0, top, 0, top + textHeight);
      gradient.addColorStop(0, "#AD2C06");
      gradient.addColorStop(0.25, "#CA3609");
      gradient.addColorStop(0.52, "#A92505");
      gradient.addColorStop(0.78, "#491005");
      gradient.addColorStop(1, "#05050500");
      baseContext.fillStyle = gradient;
      baseContext.fillRect(0, 0, width, height);

      let seed = 71327;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      const ink = maskContext.getImageData(0, 0, mask.width, mask.height);
      const coverage = ink.data.slice();
      const inside = (x: number, y: number) => {
        const px = Math.floor(x * ratio);
        const py = Math.floor(y * ratio);
        return px >= 0 && py >= 0 && px < mask.width && py < mask.height
          && coverage[(py * mask.width + px) * 4 + 3] >= 128;
      };
      // Re-sample the edge at two scales to break the typeset outline into grains.
      const erosion = Math.max(0.7, textHeight * 0.007);
      for (let py = 0; py < mask.height; py++) {
        const y = py / ratio;
        const skew = Math.sin(y * 0.37) + Math.sin(y * 0.13);
        for (let px = 0; px < mask.width; px++) {
          const alpha = (py * mask.width + px) * 4 + 3;
          if (!coverage[alpha]) continue;
          const x = px / ratio;
          if (!inside(x + erosion * (skew * 0.25 + random() - 0.5),
              y + erosion * (Math.sin(x * 0.32) * 0.4 + random() - 0.5))) {
            ink.data[alpha] = 0;
          }
        }
      }
      maskContext.putImageData(ink, 0, 0);
      // Low-resolution orange light breaks up the broad strokes behind the fine grains.
      const clouds = document.createElement("canvas");
      clouds.width = Math.max(2, Math.ceil(width / 13));
      clouds.height = Math.max(2, Math.ceil(height / 13));
      const cloudContext = clouds.getContext("2d")!;
      const cloudsInk = cloudContext.createImageData(clouds.width, clouds.height);
      for (let i = 0; i < cloudsInk.data.length; i += 4) {
        cloudsInk.data[i] = 88;
        cloudsInk.data[i + 1] = 17;
        cloudsInk.data[i + 2] = 3;
        cloudsInk.data[i + 3] = random() ** 2 * 115;
      }
      cloudContext.putImageData(cloudsInk, 0, 0);
      baseContext.globalCompositeOperation = "source-atop";
      baseContext.drawImage(clouds, 0, top, width, textHeight);
      baseContext.globalCompositeOperation = "source-over";
      // Cache fine, irregular grain once per resize, independent of animation.
      const grainCount = Math.floor(width * height * 0.7);
      for (let i = 0; i < grainCount; i++) {
        const x = random() * width;
        const y = top + random() * textHeight;
        baseContext.globalAlpha = (0.15 + random() * 0.55) * (1 - (y - top) / textHeight) ** 1.3;
        baseContext.fillStyle = i % 3 === 0 ? "#C63D0D" : "#FF8944";
        const grainSize = 0.35 + random() * 0.65;
        baseContext.fillRect(x, y, grainSize, grainSize);
      }
      baseContext.globalAlpha = 1;
      baseContext.globalCompositeOperation = "destination-in";
      baseContext.drawImage(mask, 0, 0, width, height);
      baseContext.globalCompositeOperation = "source-over";

      // Cache the bloom and loose embers together so the fringe costs one blit.
      bloomContext.shadowColor = config.colors.middle;
      bloomContext.shadowBlur = Math.min(14, width * 0.009) * ratio;
      bloomContext.globalAlpha = config.glowIntensity;
      bloomContext.drawImage(base, 0, 0, width, height);
      bloomContext.shadowBlur = 0;
      const attempts = Math.floor(width * textHeight * 1.34);
      for (let i = 0; i < attempts; i++) {
        const x = random() * width;
        const y = top + random() * textHeight;
        if (!inside(x, y)) continue;
        const angle = random() * Math.PI * 2;
        const radius = spread * random() ** 2 * (0.76 + 0.24 * Math.sin(x * 0.024 + y * 0.043));
        const dx = x + Math.cos(angle) * radius;
        const dy = y + Math.sin(angle) * radius;
        if (inside(dx, dy)) continue;
        const fade = 1 - (y - top) / textHeight;
        bloomContext.globalAlpha = (0.12 + random() ** 2 * 0.75) * fade * (1 - radius / spread);
        bloomContext.fillStyle = i % 7 === 0 ? "#FF8A45" : "#E5440D";
        const diameter = (0.3 + random() ** 2 * 0.8) * Math.min(1.3, Math.max(0.7, width / 1500));
        bloomContext.fillRect(dx, dy, diameter, diameter);
      }

      const mobile = rect.width < 768;
      const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
      const count = Math.floor((mobile ? config.mobileParticleCount : config.particleCount) * (lowPower ? 0.65 : 1));
      positions = new Float32Array(count * 2);
      phases = new Float32Array(count);
      sizes = new Float32Array(count);
      opacities = new Float32Array(count);
      animatedX = new Float32Array(count);
      animatedY = new Float32Array(count);
      drawNext = new Int32Array(count);
      // Cache coverage once so animation only processes grains inside the word.
      let activeCount = 0;
      for (let i = 0; i < count; i++) {
        const x = random() * width;
        const y = random() * height;
        const phase = random() * Math.PI * 2;
        const size = config.particleMinSize + random() * (config.particleMaxSize - config.particleMinSize);
        const opacity = 0.2 + random() * 0.65;
        const pixel = (Math.min(mask.height - 1, Math.floor(y * ratio)) * mask.width + Math.min(mask.width - 1, Math.floor(x * ratio))) * 4;
        if (coverage[pixel + 3] < 128) continue;
        positions[activeCount * 2] = x;
        positions[activeCount * 2 + 1] = y;
        phases[activeCount] = phase;
        sizes[activeCount] = size;
        opacities[activeCount] = opacity;
        activeCount++;
      }
      phases = phases.subarray(0, activeCount);
      schedule();
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      schedule();
    });
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("resize", resize, { passive: true });
    motion.addEventListener("change", schedule);
    const fontFamily = getComputedStyle(canvas).getPropertyValue("--font-brand").trim();
    document.fonts.load(`${config.fontWeight} 100px ${fontFamily}`, config.text).then(() => {
      if (disposed) return;
      fontReady = true;
      resize();
    }).catch(() => {
      // The reserved layer stays stable if a font request fails.
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      window.removeEventListener("resize", resize);
      motion.removeEventListener("change", schedule);
    };
  }, []);

  return <canvas ref={canvasRef} />;
}
