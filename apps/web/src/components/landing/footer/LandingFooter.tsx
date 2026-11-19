import Link from "next/link";
import { ChevronDown } from "lucide-react";
import LandingLogo from "../shared/LandingLogo";
import type { LandingInfoKey, OpenLandingInfo } from "../shared/landingConfig";
import "./footer.css";

type Entry = { label: string; href?: string; info?: LandingInfoKey };
const groups: { title: string; entries: Entry[] }[] = [
  { title: "Services", entries: ["Web Development", "Mobile Development", "Cloud Engineering", "DevOps", "AI & Automation", "Product Engineering"].map(label => ({ label, href: "/contact#project-inquiry" })) },
  { title: "Company", entries: [{ label: "About Us", href: "/#why-hexvault" }, { label: "Our Process", href: "/#how-it-works" }, { label: "Case Studies" }, { label: "Careers", href: "/careers" }, { label: "Blog" }, { label: "Contact", href: "/contact" }] },
  { title: "Resources", entries: [{ label: "Documentation" }, { label: "Help Center", info: "support" }, { label: "Guides" }, { label: "API Reference" }, { label: "Status" }, { label: "Security", href: "#footer-security" }] },
  { title: "Legal", entries: [{ label: "Privacy Policy", info: "privacy" }, { label: "Terms of Service", info: "terms" }, { label: "Cookie Policy" }, { label: "Acceptable Use" }, { label: "Data Processing" }, { label: "SLA" }] },
];

function SocialMarks() {
  return <div className="hf-social">
    <svg role="img" aria-label="GitHub" viewBox="0 0 24 24"><path d="M12 .8a11.2 11.2 0 0 0-3.54 21.82c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.34-3.8-1.34-.51-1.31-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 .1.98 1.88 3.32 1.33.1-.73.39-1.23.71-1.51-2.51-.29-5.15-1.26-5.15-5.6 0-1.24.44-2.25 1.16-3.04-.12-.29-.5-1.44.11-3 0 0 .95-.31 3.1 1.16a10.8 10.8 0 0 1 5.63 0c2.15-1.47 3.09-1.16 3.09-1.16.62 1.56.23 2.71.12 3a4.38 4.38 0 0 1 1.15 3.04c0 4.35-2.65 5.3-5.17 5.59.41.35.77 1.04.77 2.11v2.7c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z"/></svg>
    <svg role="img" aria-label="LinkedIn" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="3"/><text x="3" y="19" fill="#121316" fontSize="20" fontFamily="Arial" fontWeight="bold">in</text></svg>
    <svg role="img" aria-label="X" viewBox="0 0 24 24"><path d="M2 2h5.7l6 8.1L20.6 2h1.8l-7.9 9.3L23 22h-5.7l-6.5-8.7L3.3 22H1.5l8.4-9.9L2 2zm2.7 1.4L18 20.6h2.3L7 3.4z"/></svg>
    <svg role="img" aria-label="YouTube" viewBox="0 0 24 24"><rect y="3" width="24" height="18" rx="5"/><path fill="#121316" d="m10 8 7 4-7 4z"/></svg>
  </div>;
}

export default function LandingFooter({ onInfo }: { onInfo: OpenLandingInfo }) {
  return <footer className="hv-site-footer">
    <section className="hf-faq" aria-label="Frequently asked questions">
      <details><summary>Is the generated code production-ready?<ChevronDown /></summary><p>Review generated code, run your project’s tests, and verify it in your staging environment before deploying.</p></details>
      <details id="footer-security"><summary>Is my data and prompt history secure?<ChevronDown /></summary><p>For details on prompt retention, access controls, or your project’s security requirements, <Link href="/contact">contact our team</Link>.</p></details>
    </section>
    <div className="hf-grid">
      <div className="hf-brand">
        <Link href="/" aria-label="HEXVAULT home"><LandingLogo /></Link>
        <p className="hf-tagline">Engineering software that holds.</p>
        <p className="hf-description">We build resilient, readable and scalable systems for real-world impact.</p>
        <SocialMarks />
      </div>
      {groups.map(({ title, entries }) => <section key={title} className="hf-column"><h2>{title}</h2><ul>{entries.map(({ label, href, info }) => <li key={label}>{href ? <Link href={href}>{label}</Link> : info ? <button onClick={() => onInfo(info)}>{label}</button> : <span>{label}</span>}</li>)}</ul></section>)}
      <p className="hf-copyright">© HexVault Technologies {new Date().getFullYear()} · All rights reserved.</p>
    </div>
    <svg className="hf-watermark" aria-hidden="true" viewBox="0 0 1400 195"><defs><linearGradient id="hf-ink" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#28282a"/><stop offset="1" stopColor="#131417"/></linearGradient></defs><text x="0" y="179" textLength="1400" lengthAdjust="spacingAndGlyphs" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="250" fill="url(#hf-ink)">HEXVAULT</text></svg>
  </footer>;
}
