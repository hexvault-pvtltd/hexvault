export interface ParticleConfig {
  particleCount: number;
  particleSize: number;
  particleOpacity: number;
  waveSpeed: number;
  waveAmplitude: number;
  attractionRadius: number;
  attractionStrength: number;
  springStiffness: number;
  damping: number;
  rippleSpeed: number;
  rippleStrength: number;
  glowIntensity: number;
}

export const defaultParticleConfig: Readonly<ParticleConfig> = {
  particleCount: 22000,
  particleSize: 1,
  particleOpacity: 0.92,
  waveSpeed: 0.22,
  waveAmplitude: 1,
  attractionRadius: 65,
  attractionStrength: 0.58,
  springStiffness: 75,
  damping: 14,
  rippleSpeed: 460,
  rippleStrength: 24,
  glowIntensity: 0.55,
};

export const RIPPLE_DURATION = 0.9;
export const MAX_RIPPLES = 6;

export function resolveParticleConfig(overrides: Partial<ParticleConfig>): ParticleConfig {
  const config = { ...defaultParticleConfig };
  for (const key of Object.keys(config) as (keyof ParticleConfig)[]) {
    const value = overrides[key];
    if (value !== undefined && Number.isFinite(value)) config[key] = Math.max(0, value);
  }
  config.attractionRadius = Math.min(100, Math.max(30, config.attractionRadius));
  config.particleCount = Math.min(50000, Math.floor(config.particleCount));
  config.particleOpacity = Math.min(1, config.particleOpacity);
  return config;
}
