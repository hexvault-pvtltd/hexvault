"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef } from "react";
import LandingLogo from "../shared/LandingLogo";
import { mainNavigation } from "../shared/siteStructure";


function NavigationLinks({onNavigate}:{onNavigate:()=>void}){return <>{mainNavigation.filter(link=>link.href!=="/contact").map(link=><Link key={link.href} href={link.href} onClick={onNavigate}>{link.label}</Link>)}</>;}

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
