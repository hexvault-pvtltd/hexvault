import localFont from "next/font/local";
import BrandParticleTexture from "./BrandParticleTexture";
import "@/styles/brand-typography.css";

const brandFont = localFont({
  src: "./fonts/RobotoCondensed.ttf",
  variable: "--font-brand",
  weight: "100 900",
  display: "block",
  preload: true,
});

export default function HeroBrandTypography() {
  return (
    <div className={`hv-brand-typography ${brandFont.variable}`} aria-hidden="true">
      <BrandParticleTexture />
    </div>
  );
}
