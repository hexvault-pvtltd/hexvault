"use client";

import Link from "next/link";
import Image from "next/image";
import { NavigationPending } from "./navigation-pending";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Bell, ChevronDown, LogOut, Menu, Search, X } from "lucide-react";
import { groupLinks, navigationForRoles, type NavLink } from "@/lib/navigation";

function isActive(path: string, href: string, links: NavLink[]) {
  if (path === href) return true;
  if (!path.startsWith(`${href}/`)) return false;
  const moreSpecificLinkExists = links.some(([, candidate]) => {
    if (candidate === href || !candidate.startsWith(`${href}/`)) return false;
    return path === candidate || path.startsWith(`${candidate}/`);
  });
  return !moreSpecificLinkExists;
}
function trapDialogFocus(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const items = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
  if (!items.length) { event.preventDefault(); return; }
  const first = items[0]; const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

export function Workspace({ children, name, role, roles }: { children: React.ReactNode; name: string; role: string; roles: string[] }) {
  const pathname = usePathname();
  const visibleGroups = navigationForRoles(roles);
  const visibleLinks = visibleGroups.flatMap(groupLinks).filter(([, href], index, links) => links.findIndex(([, candidate]) => candidate === href) === index);
  const currentGroup = visibleGroups.find(group => groupLinks(group).some(([, href]) => isActive(pathname, href, visibleLinks)))?.title ?? visibleGroups[0]?.title ?? null;
  const [expandedState, setExpandedState] = useState<{ pathname: string; group: string | null }>({ pathname, group: currentGroup });
  const expandedGroup = expandedState.pathname === pathname ? expandedState.group : currentGroup;
  const currentPageLabel = visibleLinks.filter(([, href]) => isActive(pathname, href, visibleLinks)).sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? "Dashboard";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const mobileCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("hexvault-theme");
  }, []);
  useEffect(() => {
    // Browsers can restore protected pages directly from the back-forward
    // cache without asking the server to recheck the session cookie.
    const revalidateRestoredPage = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", revalidateRestoredPage);
    return () => window.removeEventListener("pageshow", revalidateRestoredPage);
  }, []);
  useEffect(() => {
    if (!mobileOpen && !profileOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setMobileOpen(false); setProfileOpen(false); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileOpen, profileOpen]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    mobileCloseRef.current?.focus();
    return () => previous?.focus();
  }, [mobileOpen]);
  async function logout() {
    if (logoutBusy) return;
    setLogoutBusy(true); setLogoutError("");
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST" });
      if (!response.ok) { setLogoutError("Sign out did not complete. Please retry."); return; }
      window.location.replace("/login");
    } catch { setLogoutError("Could not reach the server. You are still signed in."); }
    finally { setLogoutBusy(false); }
  }
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  function navLinks(links: NavLink[]) {
    return <ul className="space-y-0.5">{links.map(([label, href, Icon]) => {
      const active = isActive(pathname, href, visibleLinks);
      return <li key={href}><Link href={href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} className={`flex min-h-9 items-center gap-2.5 rounded-xl px-3 text-xs font-medium tracking-[-.01em] transition-colors ${active ? "bg-[#171717] text-white" : "text-[#656565] hover:bg-[#f2f2f2] hover:text-[#171717]"}`}><Icon size={15} strokeWidth={1.8} aria-hidden="true"/>{label}<NavigationPending /></Link></li>;
    })}</ul>;
  }
  function sideNav(mobile = false) {
    return <nav aria-label="Workspace navigation" className="space-y-1.5">
      {visibleGroups.map((group, index) => {
        const links = groupLinks(group).filter(link => visibleLinks.includes(link));
        if (!links.length) return null;
        const expanded = expandedGroup === group.title;
        const panelId = `${mobile ? "mobile" : "desktop"}-navigation-${index}`;
        const buttonId = `${panelId}-toggle`;
        const GroupIcon = group.icon;
        return <section key={group.title} className="min-w-0">
          <button type="button" id={buttonId} aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpandedState({ pathname, group: expanded ? null : group.title })} className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${currentGroup === group.title ? "bg-neutral-100 text-[#292929]" : "text-[#656565] hover:bg-[#f2f2f2] hover:text-[#171717]"}`}>
            <span className="flex min-w-0 items-center gap-2.5">{GroupIcon && <GroupIcon size={15} strokeWidth={1.8} aria-hidden="true"/>}<span>{group.title}</span></span>
            <ChevronDown size={13} aria-hidden="true" className={`shrink-0 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}/>
          </button>
          <div id={panelId} aria-labelledby={buttonId} hidden={!expanded} className="mb-2 ml-3 mt-1 border-l border-neutral-100 pl-2">
            {navLinks(links)}
          </div>
        </section>;
      })}
      {mobile && <div className="border-t border-[var(--border)] pt-3"><button type="button" onClick={logout} disabled={logoutBusy} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-xs text-[#656565] hover:bg-[#f2f2f2]"><LogOut size={15}/>{logoutBusy ? "Signing out…" : "Sign out"}</button></div>}
    </nav>;
  }

  return <div className="h-dvh w-full overflow-hidden bg-[var(--workspace)] p-0 text-[var(--foreground)]">
    <div className="flex h-full min-h-0 w-full overflow-hidden rounded-none border-0 bg-[var(--workspace)] shadow-none">
      <aside className="hidden h-full w-[232px] shrink-0 flex-col border-r border-[var(--border)] bg-white px-3 py-5 lg:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2" aria-label="HEXVAULT home"><Image src="/brand/hexvault-logo.png" alt="" width={56} height={56} priority className="size-14 shrink-0 rounded-lg bg-neutral-950 object-contain"/><span className="text-[11px] font-bold tracking-[.16em] text-neutral-900">HEXVAULT</span></Link>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1">{sideNav()}</div>
        <div className="mt-4 border-t border-[var(--border)] pt-3"><Link href="/account" className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-[#f4f4f4]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ededed] text-[10px] font-bold">{initials}</span><span className="min-w-0 flex-1"><b className="block truncate text-[10px]">{name}</b><small className="block truncate text-[9px] text-[#858585]">{role.replaceAll("_", " ")}</small></span><ChevronDown size={13} className="text-[#858585]"/></Link><button type="button" onClick={logout} disabled={logoutBusy} className="mt-1 flex min-h-9 w-full items-center gap-2 rounded-xl px-3 text-[10px] text-[#777] hover:bg-[#f4f4f4]"><LogOut size={14}/>{logoutBusy ? "Signing out…" : "Sign out"}</button></div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[62px] items-center justify-between gap-3 border-b border-[var(--border)] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5"><button type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)} className="grid h-9 w-9 place-items-center rounded-xl bg-[#f2f2f2] lg:hidden">{mobileOpen ? <X size={17}/> : <Menu size={17}/>}</button><div className="hidden text-[10px] text-[#888] sm:block">Workspace <span className="px-1.5">/</span><span className="font-semibold text-[#292929]">{currentPageLabel}</span></div><Link href="/dashboard" aria-label="HEXVAULT home" className="flex items-center gap-2 lg:hidden"><Image src="/brand/hexvault-logo.png" alt="" width={46} height={46} className="size-10 rounded-lg bg-neutral-950 object-contain"/><span className="text-[10px] font-bold tracking-[.14em] text-neutral-900">HEXVAULT</span></Link></div>
          <div className="flex shrink-0 items-center gap-1.5">
            {searchOpen ? <form action="/search" className="flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-[#f7f7f7] px-2.5"><Search size={14} className="text-[#858585]"/><input autoFocus required minLength={2} name="q" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people, tasks…" aria-label="Search workspace" className="w-32 bg-transparent text-[11px] outline-none sm:w-52"/><button type="button" onClick={() => { setSearchOpen(false); setSearch(""); }} aria-label="Close search"><X size={14}/></button></form> : <button type="button" aria-label="Search" onClick={() => setSearchOpen(true)} className="grid h-9 w-9 place-items-center rounded-xl text-[#555] hover:bg-[#f2f2f2]"><Search size={17}/></button>}
            <Link href="/notifications" aria-label="Notifications" className="grid h-9 w-9 place-items-center rounded-xl text-[#555] hover:bg-[#f2f2f2]"><Bell size={17}/></Link>
            <div className="relative"><button type="button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} className="flex h-9 items-center gap-2 rounded-full bg-[#f2f2f2] p-1 pr-2.5"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#dedede] text-[9px] font-bold">{initials}</span><span className="hidden max-w-32 truncate text-[10px] font-semibold sm:block">{name}</span><ChevronDown size={13} className="text-[#777]"/></button>{profileOpen && <><button aria-label="Close account menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setProfileOpen(false)}/><div className="absolute right-0 top-11 z-40 w-48 rounded-2xl border border-[var(--border)] bg-white p-1.5 shadow-xl"><Link href="/account" onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2.5 text-xs hover:bg-[#f3f3f3]">My account</Link><Link href="/my-goals" onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2.5 text-xs hover:bg-[#f3f3f3]">My goals</Link><Link href="/security/sessions" onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2.5 text-xs hover:bg-[#f3f3f3]">Security sessions</Link><button type="button" onClick={logout} disabled={logoutBusy} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-rose-600 hover:bg-rose-50"><LogOut size={14}/>Sign out</button></div></>}</div>
          </div>
        </header>
        {logoutError && <p role="alert" className="mx-4 mt-3 rounded-xl bg-rose-50 px-4 py-2 text-xs text-rose-700 sm:mx-6 lg:mx-8">{logoutError}</p>}
        {mobileOpen && <div className="fixed inset-0 z-50 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)}><section onKeyDown={trapDialogFocus} role="dialog" aria-modal="true" aria-label="Workspace navigation" onClick={(event) => event.stopPropagation()} className="absolute inset-y-0 left-0 w-[min(88vw,320px)] overflow-y-auto rounded-r-[24px] bg-white p-4 shadow-2xl"><div className="mb-6 flex items-center justify-between"><Link href="/dashboard" aria-label="HEXVAULT home" className="flex items-center gap-2.5"><Image src="/brand/hexvault-logo.png" alt="" width={52} height={52} className="size-[52px] rounded-lg bg-neutral-950 object-contain"/><span className="text-[11px] font-bold tracking-[.16em] text-neutral-900">HEXVAULT</span></Link><button ref={mobileCloseRef} type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="grid h-9 w-9 place-items-center rounded-xl bg-[#f2f2f2]"><X size={17}/></button></div>{sideNav(true)}<div className="mt-5 border-t border-[var(--border)] pt-3"><p className="text-xs font-semibold">{name}</p><p className="mt-1 text-[10px] text-[#858585]">{role.replaceAll("_", " ")}</p></div></section></div>}
        <main className="workspace-main min-h-0 w-full max-w-none flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">{children}</main>
        <footer className="border-t border-[var(--border)] bg-white/50 px-5 py-3 text-[9px] text-[#929292] sm:px-8"><span>HEXVAULT</span></footer>
      </div>
    </div>
  </div>;
}
