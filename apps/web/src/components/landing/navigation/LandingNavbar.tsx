"use client";

import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";
import LandingLogo from "../shared/LandingLogo";
import { landingProducts, type OpenLandingInfo } from "../shared/landingConfig";
import NavigationDropdown from "./NavigationDropdown";

function NavigationLinks({ onInfo }: { onInfo: OpenLandingInfo }) {
  return (
    <>
      <NavigationDropdown label="Products">
        <Link href="/products"><strong>Explore our products</strong><span>Tools and platforms built for scale.</span></Link>
        {landingProducts.length ? landingProducts.map(product => (
          <Link href={product.href} key={product.name}><strong>{product.name}</strong><span>{product.description}</span></Link>
        )) : null}
      </NavigationDropdown>
      <button onClick={() => onInfo("pricing")}>Pricing</button>
      <NavigationDropdown label="Resources">
        <Link href="/careers">Careers</Link>
        <button onClick={() => onInfo("support")}>Support</button>
        <button onClick={() => onInfo("community")}>Community Guidelines</button>
      </NavigationDropdown>
      <button onClick={() => onInfo("partners")}>Partners<ChevronDown size={14} aria-hidden="true" /></button>
      <button onClick={() => onInfo("about")}>Why Hexvault<ChevronDown size={14} aria-hidden="true" /></button>
    </>
  );
}

export default function LandingNavbar({ onInfo }: { onInfo: OpenLandingInfo }) {
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

  const openInfo: OpenLandingInfo = key => {
    headerRef.current?.querySelectorAll("details[open]").forEach(details => details.removeAttribute("open"));
    onInfo(key);
  };

  return (
    <header className="hv-landing-header" ref={headerRef}>
      <nav className="hv-floating-nav" aria-label="Main navigation">
        <Link href="/" className="hv-home" aria-label="HEXVAULT home"><LandingLogo /></Link>
        <div className="hv-desktop-links"><NavigationLinks onInfo={openInfo} /></div>
        <button className="hv-signup" onClick={() => openInfo("signup")}>Sign up for free</button>
        <details className="hv-mobile-navigation">
          <summary aria-label="Toggle navigation"><Menu className="hv-menu-icon" size={22} /><X className="hv-close-icon" size={22} /></summary>
          <div className="hv-mobile-panel">
            <NavigationLinks onInfo={openInfo} />
            <button className="hv-signup" onClick={() => openInfo("signup")}>Sign up for free</button>
          </div>
        </details>
      </nav>
    </header>
  );
}
