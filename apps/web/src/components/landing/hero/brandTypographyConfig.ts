export const brandTypographyConfig = {
  text: "HEXVAULT",
  // A small width adjustment preserves Roboto Condensed's angular letterforms.
  // Font family is read from --font-brand so a replacement font uses the same renderer.
  fontWeight: 700,
  widthScale: 0.8,
  letterSpacing: -0.016,
  particleCount: 26000,
  mobileParticleCount: 2200,
  particleMinSize: 0.25,
  particleMaxSize: 1,
  movementAmplitude: 0.85,
  animationSpeed: 0.24,
  maxPixelRatio: 1.5,
  framesPerSecond: 30,
  glowIntensity: 0.32,
  colors: {
    primary: "#F46327",
    highlight: "#FF5A1F",
    middle: "#E9430C",
    shadow: "#A92C0B",
  },
} as const;
