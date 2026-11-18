import Image from "next/image";

export default function LandingLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`hv-logo${compact ? " hv-logo-compact" : ""}`}>
      <span className="hv-logo-mark" aria-hidden="true">
        <Image src="/brand/hexvault-logo-dark.webp" alt="" width={855} height={551} priority />
      </span>
      {!compact && <span>HEXVAULT</span>}
    </span>
  );
}
