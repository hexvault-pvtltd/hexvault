"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef } from "react";
import LandingLogo from "../shared/LandingLogo";
import { landingProducts } from "../shared/landingConfig";
import NavigationDropdown from "./NavigationDropdown";

function NavigationLinks({ onNavigate }: { onNavigate: () => void }) {
  return (
    <>
      <NavigationDropdown label="Products">
        <Link href="/products" onClick={onNavigate}><strong>Explore our products</strong><span>Tools and platforms built for scale.</span></Link>
        {landingProducts.length ? landingProducts.map(product => (
          <Link href={product.href} key={product.name} onClick={onNavigate}><strong>{product.name}</strong><span>{product.description}</span></Link>
        )) : null}
      </NavigationDropdown>
      <Link href="/services" onClick={onNavigate}>Services</Link>
      <Link href="/pricing" onClick={onNavigate}>Pricing</Link>
      <NavigationDropdown label="Resources">
        <Link href="/process" onClick={onNavigate}>How we work</Link>
        <Link href="/careers" onClick={onNavigate}>Careers</Link>
        <Link href="/documentation" onClick={onNavigate}>Documentation</Link>
        <Link href="/guides" onClick={onNavigate}>Guides</Link>
        <Link href="/support" onClick={onNavigate}>Support</Link>
        <Link href="/community" onClick={onNavigate}>Community Guidelines</Link>
        <Link href="/resources" onClick={onNavigate}>Knowledge Centre</Link>
        <Link href="/expertise" onClick={onNavigate}>Our Expertise</Link>
        <Link href="/technologies" onClick={onNavigate}>Technologies</Link>
        <Link href="/industries" onClick={onNavigate}>Industries</Link>
        <Link href="/research" onClick={onNavigate}>Research &amp; Development</Link>
        <Link href="/global-services" onClick={onNavigate}>Global Technology Services</Link>
        <Link href="/faq" onClick={onNavigate}>FAQs</Link>
      </NavigationDropdown>
      <NavigationDropdown label="Company"><Link href="/about" onClick={onNavigate}>About HEXVAULT</Link><Link href="/purpose" onClick={onNavigate}>Our Purpose</Link><Link href="/vision" onClick={onNavigate}>Our Vision</Link><Link href="/mission" onClick={onNavigate}>Our Mission</Link><Link href="/values" onClick={onNavigate}>Our Values</Link><Link href="/our-teams" onClick={onNavigate}>Our Teams</Link><Link href="/roadmap" onClick={onNavigate}>Roadmap</Link><Link href="/partnerships" onClick={onNavigate}>Partnerships</Link></NavigationDropdown>
    </>
  );
}

export default function LandingNavbar() {
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const close = () => headerRef.current?.querySelectorAll("details[open]").forEach(details => details.removeAttribute("open"));
    const outside = (event: PointerEvent) => { if (!headerRef.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const mobile = headerRef.current?.querySelector<HTMLDetailsElement>(".hv-mobile-navigation[open]");
      const details = mobile ?? document.activeElement?.closest("details[open]");
      close();
      details?.querySelector("summary")?.focus();
    };
    const toggle = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement) || !target.open || !target.closest(".hv-desktop-links")) return;
      headerRef.current?.querySelectorAll<HTMLDetailsElement>(".hv-desktop-links details[open]").forEach(details => {
        if (details !== target) details.open = false;
      });
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    const header = headerRef.current;
    header?.addEventListener("toggle", toggle, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      header?.removeEventListener("toggle", toggle, true);
    };
  }, []);

  const closeNavigation = () => {
    headerRef.current?.querySelectorAll("details[open]").forEach(details => details.removeAttribute("open"));
  };

  return (
    <header className="hv-landing-header" ref={headerRef}>
      <nav className="hv-floating-nav" aria-label="Main navigation">
        <Link href="/" className="hv-home" aria-label="HEXVAULT home"><LandingLogo /></Link>
        <div className="hv-desktop-links"><NavigationLinks onNavigate={closeNavigation} /></div>
        <Link className="hv-signup" href="/signup">Sign up for free</Link>
        <details className="hv-mobile-navigation">
          <summary aria-label="Toggle navigation"><Menu className="hv-menu-icon" size={22} /><X className="hv-close-icon" size={22} /></summary>
          <div className="hv-mobile-panel">
            <NavigationLinks onNavigate={closeNavigation} />
            <Link className="hv-signup" href="/signup" onClick={closeNavigation}>Sign up for free</Link>
          </div>
        </details>
      </nav>
    </header>
  );
}
