import type { ParticlePointer } from "@/hooks/useParticlePointer";
import { RIPPLE_DURATION, type ParticleConfig } from "./particleConfig";

export interface Ripple { x: number; y: number; age: number }

export function createParticleField(count: number) {
  let seed = 7391;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const field = {
    x: new Float32Array(count), z: new Float32Array(count),
    phase: new Float32Array(count), size: new Float32Array(count),
    offsetX: new Float32Array(count), offsetY: new Float32Array(count),
    velocityX: new Float32Array(count), velocityY: new Float32Array(count),
  };
  // Jittered stratification preserves a surface while breaking visible rows.
  const columns = Math.ceil(Math.sqrt(count * 2.5));
  const rows = Math.ceil(count / columns);
  for (let i = 0; i < count; i++) {
    field.x[i] = ((i % columns + random()) / columns - 0.5) * 6.6;
    field.z[i] = 0.9 + (Math.floor(i / columns) + random()) / rows * 5.8;
    field.phase[i] = random() * Math.PI * 2;
    field.size[i] = 0.5 + random() * 1.1;
  }
  return field;
}

export type ParticleField = ReturnType<typeof createParticleField>;

function noiseHash(x: number, z: number) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function smoothNoise(x: number, z: number) {
  const cellX = Math.floor(x);
  const cellZ = Math.floor(z);
  const fractionX = x - cellX;
  const fractionZ = z - cellZ;
  const blendX = fractionX * fractionX * (3 - 2 * fractionX);
  const blendZ = fractionZ * fractionZ * (3 - 2 * fractionZ);
  const top = noiseHash(cellX, cellZ) * (1 - blendX) + noiseHash(cellX + 1, cellZ) * blendX;
  const bottom = noiseHash(cellX, cellZ + 1) * (1 - blendX) + noiseHash(cellX + 1, cellZ + 1) * blendX;
  return top * (1 - blendZ) + bottom * blendZ - 0.5;
}

// Writes into a reused vector. Distances after projection are CSS pixels.
export function projectParticle(field: ParticleField, i: number, time: number, width: number, height: number, config: ParticleConfig, output: Float32Array) {
  const x = field.x[i];
  const z = field.z[i];
  const t = time * config.waveSpeed;
  const depth = z + Math.sin(t * 0.43 + z) * 0.045;
  const perspective = 1.6 / depth;
  const waves = Math.sin(x * 2.1 + z * 2.8 + t) * 0.13
    + Math.sin(x * 4.4 - z * 1.7 - t * 0.67) * 0.065
    + Math.cos(x * 1.3 + z * 4.6 + t * 0.48) * 0.055
    + smoothNoise(x * 1.4 + t * 0.12, z * 1.1 - t * 0.08) * 0.09;
  const valley = 0.46 * Math.exp(-x * x * 0.85);
  output[0] = width * 0.5 + x * perspective * width * 0.4;
  output[1] = height * (0.48 + (0.34 + valley + waves * config.waveAmplitude) * perspective);
  output[2] = perspective;
  output[3] = waves;
}

export function stepParticle(field: ParticleField, i: number, x: number, y: number, time: number, dt: number, pointer: ParticlePointer, ripples: Ripple[], config: ParticleConfig) {
  let targetX = 0;
  let targetY = 0;
  if (pointer.active) {
    const dx = pointer.x - x;
    const dy = pointer.y - y;
    const distance = Math.hypot(dx, dy);
    const falloff = Math.max(0, 1 - distance / config.attractionRadius);
    const attraction = falloff * falloff * (3 - 2 * falloff) * config.attractionStrength;
    targetX += dx * attraction;
    targetY += dy * attraction;
    if (pointer.touch && pointer.held) {
      targetX += Math.sin(time * 7 + field.phase[i]) * falloff * 1.4;
      targetY += Math.cos(time * 6 + field.phase[i]) * falloff * 1.4;
    }
  }
  for (const ripple of ripples) {
    const dx = x - ripple.x;
    const dy = y - ripple.y;
    const distance = Math.hypot(dx, dy);
    const waveDistance = (distance - ripple.age * config.rippleSpeed) / 26;
    const envelope = Math.exp(-waveDistance * waveDistance) * (1 - ripple.age / RIPPLE_DURATION) ** 2;
    const force = config.rippleStrength * envelope / (1 + distance * 0.003);
    targetX += dx / Math.max(1, distance) * force;
    targetY += dy / Math.max(1, distance) * force;
  }
  // Bounded substeps keep the damped spring stable at low frame rates.
  const steps = Math.ceil(dt / (1 / 120));
  const step = dt / Math.max(1, steps);
  for (let n = 0; n < steps; n++) {
    field.velocityX[i] += ((targetX - field.offsetX[i]) * config.springStiffness - field.velocityX[i] * config.damping) * step;
    field.velocityY[i] += ((targetY - field.offsetY[i]) * config.springStiffness - field.velocityY[i] * config.damping) * step;
    field.offsetX[i] += field.velocityX[i] * step;
    field.offsetY[i] += field.velocityY[i] * step;
  }
}
