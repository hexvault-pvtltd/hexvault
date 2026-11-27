import Link from "next/link";
import { companyCopy } from "../shared/companyCopy";

export default function HeroContent() {
  return (
    <div className="hv-hero-content">
      <p className="hv-hero-motto">{companyCopy.motto}</p>
      <h1>Delivering <span>Solutions.</span></h1>
      <p>{companyCopy.summary}</p>
      <div className="hv-hero-actions">
        <Link className="hv-action hv-action-primary" href="/contact">Contact Us</Link>
        <Link className="hv-action hv-action-secondary" href="/services#engagements">View Pricing</Link>
      </div>
    </div>
  );
}
