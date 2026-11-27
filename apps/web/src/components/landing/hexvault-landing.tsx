import HeroBrandTypography from "./hero/HeroBrandTypography";
import ParticleBackground from "./background/ParticleBackground";
import HeroContent from "./hero/HeroContent";
import LandingNavbar from "./navigation/LandingNavbar";
import LandingFooter from "./footer/LandingFooter";
import LandingBody from "./LandingBody";
import "@/styles/landing.css";

export default function HexvaultLanding() {
  return (
    <main className="hv-landing">
      <section className="hv-landing-hero">
        <ParticleBackground animated={false} />
        <HeroBrandTypography />
        <LandingNavbar />
        <HeroContent />
      </section>
      <LandingBody />
      <LandingFooter showFaq />
    </main>
  );
}
