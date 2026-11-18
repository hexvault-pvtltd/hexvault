import ParticleCanvas from "./ParticleCanvas";
import type { ParticleConfig } from "./particleConfig";

export interface ParticleBackgroundProps {
  config?: Partial<ParticleConfig>;
  className?: string;
}

export default function ParticleBackground({ config, className = "" }: ParticleBackgroundProps) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#050505] ${className}`}>
      <ParticleCanvas config={config} />
    </div>
  );
}
