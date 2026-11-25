"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export default function LandingIntro({ children, skipIntro = false }: { children: ReactNode; skipIntro?: boolean }) {
  const [phase, setPhase] = useState<"loading" | "leaving" | "ready">(skipIntro ? "ready" : "loading");
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skipIntro) return;
    let active = true;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let finished = false;
    const page = pageRef.current;
    if (page) page.inert = true;
    const finish = () => {
      if (!active || finished) return;
      finished = true;
      document.cookie = `hv_landing_intro=seen; Path=/; Max-Age=2592000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
      if (page) page.inert = false;
      setPhase("leaving");
      exitTimer = setTimeout(() => { if (active) setPhase("ready"); }, 320);
    };
    let loaded: (() => void) | undefined;
    const pageReady = document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>(resolve => { loaded = resolve; window.addEventListener("load", loaded, { once: true }); });
    let minimumTimer: ReturnType<typeof setTimeout>;
    const minimum = new Promise<void>(resolve => { minimumTimer = setTimeout(resolve, 1100); });
    const maximumTimer = setTimeout(finish, 4500);
    void Promise.all([pageReady, document.fonts.ready, minimum]).then(finish);
    return () => {
      active = false;
      if (page) page.inert = false;
      if (loaded) window.removeEventListener("load", loaded);
      clearTimeout(minimumTimer);
      clearTimeout(maximumTimer);
      clearTimeout(exitTimer);
    };
  }, [skipIntro]);

  return <>
    {phase !== "ready" && <div className={`hv-landing-intro${phase === "leaving" ? " hv-landing-intro-leaving" : ""}`} role="status" aria-live="polite" aria-label="Loading HEXVAULT">
      <div className="hv-landing-intro-content">
        <p>Loading HEXVAULT</p>
        <div className="hv-landing-intro-track" aria-hidden="true"><span /></div>
      </div>
    </div>}
    <div ref={pageRef} className="hv-landing-intro-page">{children}</div>
    <noscript><style>{`.hv-landing-intro{display:none!important}.hv-landing-intro-page{visibility:visible!important}`}</style><p style={{ textAlign: "center" }}>Enable JavaScript for interactive features.</p></noscript>
  </>;
}
