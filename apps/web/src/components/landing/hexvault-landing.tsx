"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import ParticleBackground from "./background/ParticleBackground";
import HeroBrandTypography from "./hero/HeroBrandTypography";
import HeroContent from "./hero/HeroContent";
import LandingNavbar from "./navigation/LandingNavbar";
import LandingFooter from "./footer/LandingFooter";
import { landingInfo, type OpenLandingInfo } from "./shared/landingConfig";
import "@/styles/landing.css";

export default function HexvaultLanding() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [info, setInfo] = useState<keyof typeof landingInfo>("products");
  const onInfo: OpenLandingInfo = key => {
    triggerRef.current = document.activeElement as HTMLElement;
    setInfo(key);
    dialogRef.current?.showModal();
  };
  return (
    <main className="hv-landing">
      <section className="hv-landing-hero">
        <ParticleBackground />
        <HeroBrandTypography />
        <LandingNavbar onInfo={onInfo} />
        <HeroContent onInfo={onInfo} />
      </section>
      <LandingFooter onInfo={onInfo} />
      <dialog className="hv-info-dialog" ref={dialogRef} aria-labelledby="hv-dialog-title" aria-describedby="hv-dialog-description" onClose={() => {
        const trigger = triggerRef.current;
        if (trigger?.matches("button, a, summary") && !trigger.closest("details:not([open])") && trigger.getClientRects().length) trigger.focus();
        else document.querySelector<HTMLElement>(window.innerWidth <= 900 ? ".hv-mobile-navigation > summary" : ".hv-home")?.focus();
      }} onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
        <div className="hv-dialog-content">
          <button className="hv-dialog-close" aria-label="Close" onClick={() => dialogRef.current?.close()}><X size={20} /></button>
          <h2 id="hv-dialog-title">{landingInfo[info].title}</h2>
          <p id="hv-dialog-description">{landingInfo[info].description}</p>
          {info === "signup" && <Link href="/login">Team member sign in</Link>}
        </div>
      </dialog>
    </main>
  );
}
