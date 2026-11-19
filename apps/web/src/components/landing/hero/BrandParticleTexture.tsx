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
    const emberGlow = document.createElement("canvas");
    emberGlow.width = emberGlow.height = 32;
    const emberContext = emberGlow.getContext("2d")!;
    const emberGradient = emberContext.createRadialGradient(16, 16, 0, 16, 16, 16);
    emberGradient.addColorStop(0, "#ffb16d90");
    emberGradient.addColorStop(0.25, "#ff762d45");
    emberGradient.addColorStop(1, "#ff5a1f00");
    emberContext.fillStyle = emberGradient;
    emberContext.fillRect(0, 0, 32, 32);
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
    // Each exterior ember: x, y, outward normal x/y, phase, lifetime,
    // drift distance, size, opacity. Seeded once when the lettering resizes.
    let outerParticles = new Float32Array(0);
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
      // Draw the drifting halo outside the mask, behind the letter texture.
      // No image-data reads, new canvases, or particle allocation per frame.
      context.globalCompositeOperation = "lighter";
      for (let i = 0, particle = 0; i < outerParticles.length; i += 9, particle++) {
        const phase = outerParticles[i + 4];
        const age = (time / outerParticles[i + 5] + phase) % 1;
        const distance = 1 + age ** 0.85 * outerParticles[i + 6];
        const swirl = (Math.sin(time * 0.65 + phase * Math.PI * 2)
          + Math.sin(time * 1.7 + phase * 11) * 0.4) * distance * 0.24;
        const normalX = outerParticles[i + 2];
        const normalY = outerParticles[i + 3];
        const x = outerParticles[i] + normalX * distance - normalY * swirl;
        const y = outerParticles[i + 1] + normalY * distance + normalX * swirl - age * age * 5;
        const opacity = Math.sin(Math.PI * age) ** 0.85 * outerParticles[i + 8];
        if (opacity < 0.015) continue;
        const size = outerParticles[i + 7];
        context.globalAlpha = opacity;
        if (particle % 16 === 0) context.drawImage(emberGlow, x - size * 5, y - size * 5, size * 10, size * 10);
        context.fillStyle = particle % 4 === 0 ? "#FFAD6B" : config.colors.highlight;
        context.fillRect(x, y, size, size);
        if (particle % 23 === 0) {
          context.globalAlpha = opacity * 0.3;
          context.strokeStyle = config.colors.primary;
          context.lineWidth = size * 0.6;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x - normalX * size * 4, y - normalY * size * 4);
          context.stroke();
        }
      }
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
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
      let coverage = ink.data.slice();
      const inside = (x: number, y: number) => {
        const px = Math.floor(x * ratio);
        const py = Math.floor(y * ratio);
        return px >= 0 && py >= 0 && px < mask.width && py < mask.height
          && coverage[(py * mask.width + px) * 4 + 3] >= 128;
      };
      // Coherent patches create uneven notches instead of a uniformly fuzzy
      // outline. Keep the broad stroke interiors intact for readability.
      const edgeField = (x: number, y: number) => Math.sin(x * 0.043 + Math.sin(y * 0.057) * 1.8) * 0.5
        + Math.sin(x * 0.117 - y * 0.083) * 0.3 + Math.sin(x * 0.31 + y * 0.23) * 0.2;
      const erosion = Math.max(1, Math.min(10, textHeight * config.edgeRoughness));
      const edgeProbe = erosion * 1.4;
      for (let py = 0; py < mask.height; py++) {
        const y = py / ratio;
        for (let px = 0; px < mask.width; px++) {
          const alpha = (py * mask.width + px) * 4 + 3;
          if (!coverage[alpha]) continue;
          const x = px / ratio;
          if (inside(x - edgeProbe, y) && inside(x + edgeProbe, y)
            && inside(x, y - edgeProbe) && inside(x, y + edgeProbe)) continue;
          const patch = edgeField(x, y);
          const dx = erosion * (patch + (random() - 0.5) * 0.5);
          const dy = erosion * (edgeField(y + 53, x - 17) + (random() - 0.5) * 0.5);
          if (!inside(x + dx, y + dy) || random() < Math.max(0, patch) * 0.055) {
            ink.data[alpha] = 0;
          }
        }
      }
      maskContext.putImageData(ink, 0, 0);
      // Both the cached fringe and moving particles follow the roughened edge.
      coverage = ink.data.slice();
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
      // Sample the real glyph boundary, including the curved/slanted edges,
      // rather than surrounding the word with a rectangular particle field.
      const edgeSeeds: number[] = [];
      const step = Math.max(2, Math.min(4, textHeight / 100));
      const probe = step + 1;
      for (let y = top; y < top + textHeight; y += step) {
        for (let x = left; x < left + textWidth; x += step) {
          if (!inside(x, y)) continue;
          const nx = Number(inside(x - probe, y)) - Number(inside(x + probe, y));
          const ny = Number(inside(x, y - probe)) - Number(inside(x, y + probe));
          const length = Math.hypot(nx, ny);
          if (!length) continue;
          const normalX = nx / length;
          const normalY = ny / length;
          const seedX = x + normalX * (probe + 1);
          const seedY = y + normalY * (probe + 1);
          if (!inside(seedX, seedY)) edgeSeeds.push(seedX, seedY, normalX, normalY);
        }
      }
      // Cache clustered, uneven flakes along selected perimeter patches.
      // These dense protrusions bridge the silhouette and loose drifting dust.
      const clusteredSeeds: number[] = [];
      for (let seed = 0; seed < edgeSeeds.length; seed += 4) {
        const sx = edgeSeeds[seed];
        const sy = edgeSeeds[seed + 1];
        const patch = Math.max(0, Math.min(1, 0.5 + edgeField(sx, sy) * 0.5));
        const weight = 1 + Math.floor(patch * 4);
        for (let repeat = 0; repeat < weight; repeat++) clusteredSeeds.push(seed);
        if (random() > config.edgeClusterDensity * (0.25 + patch * 0.75)) continue;
        const nx = edgeSeeds[seed + 2];
        const ny = edgeSeeds[seed + 3];
        const radius = erosion * config.edgeClusterSize * (0.3 + patch * 0.7) * (0.45 + random() * 0.8);
        const anchorX = sx - nx * probe * 0.7;
        const anchorY = sy - ny * probe * 0.7;
        const fade = 0.2 + Math.max(0, 1 - (sy - top) / textHeight) * 0.8;
        for (let grain = 0; grain < 5 + patch * 7; grain++) {
          const outward = random() ** 1.4 * radius * 1.7;
          const tangent = (random() - 0.5) * radius * 1.6;
          const x = anchorX + nx * outward - ny * tangent;
          const y = anchorY + ny * outward + nx * tangent;
          if (inside(x, y)) continue;
          const size = (0.45 + random() ** 2 * 2.2) * (mobile ? 0.65 : 1);
          bloomContext.globalAlpha = (0.15 + random() * 0.5) * fade * (0.55 + patch * 0.45);
          bloomContext.fillStyle = grain % 5 === 0 ? "#F87C37" : "#D83D0B";
          bloomContext.fillRect(x, y, size * (0.7 + random()), size);
        }
      }
      bloomContext.globalAlpha = 1;
      const outerCount = edgeSeeds.length ? Math.floor((mobile ? config.mobileOuterParticleCount : config.outerParticleCount) * (lowPower ? 0.6 : 1)) : 0;
      outerParticles = new Float32Array(outerCount * 9);
      const outerRange = Math.min(config.outerDriftDistance, Math.max(12, spread * 1.15));
      for (let i = 0; i < outerCount; i++) {
        const seed = clusteredSeeds[Math.floor(random() * clusteredSeeds.length)];
        const offset = i * 9;
        outerParticles[offset] = edgeSeeds[seed];
        outerParticles[offset + 1] = edgeSeeds[seed + 1];
        outerParticles[offset + 2] = edgeSeeds[seed + 2];
        outerParticles[offset + 3] = edgeSeeds[seed + 3];
        outerParticles[offset + 4] = random();
        outerParticles[offset + 5] = 4.5 + random() * 4;
        const patch = Math.max(0, Math.min(1, 0.5 + edgeField(edgeSeeds[seed], edgeSeeds[seed + 1]) * 0.5));
        outerParticles[offset + 6] = outerRange * (0.2 + random() * 0.6) * (0.5 + patch * 0.8);
        outerParticles[offset + 7] = (config.outerParticleMinSize + random() * (config.outerParticleMaxSize - config.outerParticleMinSize)) * (mobile ? 0.85 : 1);
        const verticalFade = Math.max(0, 1 - (edgeSeeds[seed + 1] - top) / textHeight);
        outerParticles[offset + 8] = config.outerOpacity * (0.35 + random() * 0.65) * (0.32 + verticalFade * 0.68);
      }
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
