import Link from "next/link";

export default function HeroContent() {
  return (
    <div className="hv-hero-content">
      <h1>Multiplayer mode for <span>AI development</span></h1>
      <p>Collaborate, build, and scale AI-powered solutions together in real-time.</p>
      <div className="hv-hero-actions">
        <Link className="hv-action hv-action-primary" href="/contact">Contact Us</Link>
        <a className="hv-action hv-action-secondary" href="#pricing">View Pricing</a>
      </div>
    </div>
  );
}
