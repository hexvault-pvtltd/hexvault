import type { ParticlePointer } from "@/hooks/useParticlePointer";
import { RIPPLE_DURATION, type ParticleConfig } from "./particleConfig";

export interface Ripple { x: number; y: number; age: number }

export function createParticleField(count: number, aspect = 1.8) {
  let seed = 7391;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const field = {
    x: new Float32Array(count), z: new Float32Array(count),
    horizon: new Float32Array(count), relief: new Float32Array(count),
    light: new Float32Array(count), tint: new Uint8Array(count),
    phase: new Float32Array(count), size: new Float32Array(count),
    flow: new Float32Array(count), turbulence: new Float32Array(count),
    offsetX: new Float32Array(count), offsetY: new Float32Array(count),
    velocityX: new Float32Array(count), velocityY: new Float32Array(count),
  };
  const portrait = Math.max(0, 1 - aspect);
  const columns = Math.ceil(Math.sqrt(count * Math.min(4, aspect * 2)));
  const rows = Math.ceil(count / columns);
  for (let i = 0; i < count; i++) {
    const z = (Math.floor(i / columns) + random()) / rows;
    const u = 2 * ((i % columns + random()) / columns) - 1;
    // Redistribute samples toward the banks. Keep the full valley on narrow screens.
    const lateral = Math.sign(u) * Math.abs(u) ** (0.78 + portrait * 0.14);
    const perspective = 0.72 + z * z * (1.45 - portrait * 0.5);
    const worldX = lateral * (2.6 - portrait * 0.8) / perspective;
    const worldZ = z * 4.2;
    const wx = worldX + fbm(worldX * 0.65, worldZ * 0.59) * 0.83;
    const wz = worldZ + fbm(worldZ * 0.72 + 12, worldX * 0.77) * 0.78;
    const terrain = fbm(wx * 1.12, wz * 1.36);
    const pockets = smoothNoise(wx * 2.3 + 18, wz * 2.1);
    const bank = Math.abs(lateral);
    // Broad folds overlap at different depths and taper independently along each bank.
    const rear = Math.exp(-((wz - 0.85 - 0.38 * wx) ** 2) / 0.18);
    const front = Math.exp(-((wz - 2.8 + 0.28 * wx) ** 2) / 0.33);
    const ridge = rear * (0.68 + pockets * 0.6) + front * (0.84 - pockets * 0.58);
    const ambient = random() < 0.085;
    const localScatter = random() - 0.5;
    field.x[i] = 0.5 + lateral * 0.51;
    field.z[i] = z;
    field.horizon[i] = 0.49 + (1 - bank ** 1.5) * (0.15 + portrait * 0.055) + z * 0.34;
    field.relief[i] = terrain * (0.095 + bank * 0.095) - ridge * (0.045 + bank * 0.04)
      + localScatter * (ambient ? 0.20 : 0.008 + Math.abs(pockets) * 0.023);
    field.phase[i] = random() * Math.PI * 2;
    field.flow[i] = wx * 1.34 + wz * 1.75 + terrain;
    field.turbulence[i] = pockets * 2.4 + 0.5 * wx - wz * 0.75;
    const rank = random();
    const tint = ambient || rank < 0.69 ? 0 : rank > 0.96 - ridge * 0.044 ? 2 : 1;
    field.tint[i] = tint;
    const radius = tint === 0 ? 0.26 + random() * 0.44
      : tint === 1 ? 0.62 + random() * 0.55 : 0.85 + random() * 0.7;
    field.size[i] = radius * 2 * (0.67 + perspective * 0.38) * (1 - portrait * 0.22);
    const centerMask = 0.14 + 0.86 * (1 - Math.exp(-((bank / 0.47) ** 3)));
    const fade = Math.min(1, z / 0.14, (1 - z) / 0.16);
    field.light[i] = (ambient ? 0.26 : 0.5 + z * 0.28 + ridge * 0.42 + pockets * 0.45)
      * (tint === 0 ? 0.55 : tint === 1 ? 0.84 : 1.15) * centerMask * fade;
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

function fbm(x: number, z: number) {
  return smoothNoise(x, z) + 0.46 * smoothNoise(x * 2.07 - z * 0.53, z * 2.07 + x * 0.53)
    + 0.21 * smoothNoise(x * 4.51 + 7, z * 4.38 - 3);
}

// Terrain samples are stable. Two slow velocity fields deform them continuously.
export function projectParticle(field: ParticleField, i: number, time: number, width: number, height: number, config: ParticleConfig, output: Float32Array) {
  const t = time * config.waveSpeed;
  const depth = field.z[i];
  const flow = Math.sin(t * 0.66 + field.flow[i]);
  const eddy = Math.sin(t * 1.21 + field.turbulence[i]);
  const drift = Math.sin(t + field.phase[i]);
  output[0] = width * (field.x[i] + (flow * 0.0024 + eddy * 0.0012) * (0.3 + depth)) + drift * 0.55;
  output[1] = height * (field.horizon[i] + config.waveAmplitude * (field.relief[i]
    + (flow * 0.008 + eddy * 0.004) * (0.4 + depth))) + drift * depth * 0.6;
}
export function stepParticle(field: ParticleField, i: number, x: number, y: number, time: number, dt: number, pointer: ParticlePointer, ripples: Ripple[], config: ParticleConfig) {
  let targetX = 0;
  let targetY = 0;
  if (pointer.active) {
    const dx = pointer.x - x;
    const dy = pointer.y - y;
    const distance = Math.hypot(dx, dy);
    const response = 0.65 + field.phase[i] * 0.08;
    const radius = config.attractionRadius * (0.96 + field.turbulence[i] * 0.025);
    const falloff = Math.max(0, 1 - distance / radius);
    const attraction = falloff * falloff * (3 - 2 * falloff) * config.attractionStrength * response;
    targetX += dx * attraction;
    targetY += (dy + dx * 0.065 * field.turbulence[i]) * attraction;
    if (pointer.touch && pointer.held) {
      targetX += Math.sin(time * 7 + field.phase[i]) * falloff * 1.4;
      targetY += Math.cos(time * 6 + field.phase[i]) * falloff * 1.4;
    }
  }
  for (const ripple of ripples) {
    const dx = x - ripple.x;
    const dy = y - ripple.y;
    const distance = Math.hypot(dx, dy);
    const radius = ripple.age * config.rippleSpeed;
    if (Math.abs(distance - radius) > 100) continue;
    const angle = Math.atan2(dy, dx);
    const front = radius * (1 + 0.025 * Math.sin(3 * angle) + 0.018 * Math.cos(5 * angle + 0.7));
    const waveDistance = (distance - front) / 26;
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
