import Link from "next/link";
import type { OpenLandingInfo } from "../shared/landingConfig";

export default function HeroContent({ onInfo }: { onInfo: OpenLandingInfo }) {
  return (
    <div className="hv-hero-content">
      <h1>Multiplayer mode for <span>AI development</span></h1>
      <p>Collaborate, build, and scale AI-powered solutions together in real-time.</p>
      <div className="hv-hero-actions">
        <Link className="hv-action hv-action-primary" href="/contact">Contact Us</Link>
        <button className="hv-action hv-action-secondary" onClick={() => onInfo("pricing")}>View Pricing</button>
      </div>
    </div>
  );
}
