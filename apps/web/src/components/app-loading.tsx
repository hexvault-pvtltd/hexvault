"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoadingScreen } from "./loading-screen";

function RouteCommit({ onCommit }: { onCommit: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useLayoutEffect(() => { onCommit(); }, [pathname, search, onCommit]);
  return null;
}

export function AppLoading({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "leaving" | "ready">("loading");
  const [stalled, setStalled] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const loading = useRef(true);
  const committed = useRef(false);
  const started = useRef(0);
  const requests = useRef(0);
  const lastActivity = useRef(0);
  const destination = useRef<string | null>(null);
  const lastRoute = useRef<string | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const begin = useCallback(() => {
    clearTimeout(fadeTimer.current);
    loading.current = true;
    committed.current = false;
    started.current = performance.now();
    lastActivity.current = performance.now();
    if (contentRef.current) contentRef.current.inert = true;
    setStalled(false);
    setPhase("loading");
  }, []);

  const onCommit = useCallback(() => {
    if (!loading.current) begin();
    committed.current = true;
    lastRoute.current = window.location.pathname + window.location.search;
    lastActivity.current = performance.now();
  }, [begin]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (content) content.inert = true;
    started.current = performance.now();
    // Observe API completion without changing requests, responses, or errors.
    const originalFetch = window.fetch;
    const observedFetch: typeof fetch = async (...args) => {
      const input = args[0];
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.href);
      const tracked = url.origin === window.location.origin && url.pathname.startsWith("/api/");
      if (tracked) { requests.current++; lastActivity.current = performance.now(); }
      try { return await originalFetch.apply(window, args); }
      finally { if (tracked) { requests.current--; lastActivity.current = performance.now(); } }
    };
    window.fetch = observedFetch;
    const mutation = new MutationObserver(() => { lastActivity.current = performance.now(); });
    // Watch page content, excluding the loader's own animation and status.
    if (content) mutation.observe(content, { childList: true, subtree: true });
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      destination.current = url.href;
      begin();
    };
    const popstate = () => {
      if (window.location.pathname + window.location.search === lastRoute.current) return;
      destination.current = window.location.href;
      begin();
    };
    const pageshow = (event: PageTransitionEvent) => { if (event.persisted) { begin(); committed.current = true; } };
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", popstate);
    window.addEventListener("pageshow", pageshow);
    const timer = window.setInterval(() => {
      if (!loading.current) return;
      const now = performance.now();
      if (now - started.current > 20000) setStalled(true);
      if (!committed.current || requests.current || document.readyState !== "complete" || document.fonts.status === "loading") return;
      if (content?.querySelector('[data-route-loading="true"], [aria-busy="true"]')) return;
      const waitingForImage = Array.from(content?.querySelectorAll("img") ?? []).some(img => {
        const rect = img.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
        return !img.complete && (img.loading !== "lazy" || visible);
      });
      if (waitingForImage || now - lastActivity.current < 180 || now - started.current < 450) return;
      loading.current = false;
      setStalled(false);
      setPhase("leaving");
      fadeTimer.current = setTimeout(() => {
        if (content) content.inert = false;
        setPhase("ready");
      }, 240);
    }, 80);
    return () => {
      if (window.fetch === observedFetch) window.fetch = originalFetch;
      if (content) content.inert = false;
      mutation.disconnect();
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", popstate);
      window.removeEventListener("pageshow", pageshow);
      window.clearInterval(timer);
      clearTimeout(fadeTimer.current);
    };
  }, [begin]);

  useEffect(() => {
    if (phase === "ready") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [phase]);

  return <>
    <Suspense fallback={null}><RouteCommit onCommit={onCommit}/></Suspense>
    {phase !== "ready" && <LoadingScreen leaving={phase === "leaving"}/>}
    {stalled && <div className="hv-loading-recovery"><p>This page is taking longer than expected.</p><button type="button" onClick={() => window.location.assign(destination.current ?? window.location.href)}>Reload page</button></div>}
    <div ref={contentRef}>{children}</div>
    <noscript><style>{`.hv-loading-screen{display:none!important}`}</style></noscript>
  </>;
}
