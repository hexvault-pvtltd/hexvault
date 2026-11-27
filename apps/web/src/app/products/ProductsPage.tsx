"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import CompanyProductRoadmap, { approvedProductStatus, approvedProductAnchor } from "@/components/landing/shared/CompanyProductRoadmap";
import { CompanyStatus } from "@/components/landing/shared/CompanyContent";
import LandingFooter from "@/components/landing/footer/LandingFooter";
import LandingLogo from "@/components/landing/shared/LandingLogo";
import { formatProductPrice, type CatalogProduct } from "@core/features/products/catalog";


function ProductMark() {
  return <svg viewBox="0 0 56 62" fill="none" aria-hidden="true"><path d="m28 2 25 14v30L28 60 3 46V16Z"/><path d="m28 14 15 9v17l-15 9-15-9V23Z"/><path d="m14 24 14 9 15-9M28 21l9 5-9 5-8-5M14 33l14 9 15-9"/></svg>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: "", description: "" });
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const touchStart = useRef<number | null>(null);
  const product = products[active];
  const previous = products[(active - 1 + products.length) % products.length];
  const next = products[(active + 1) % products.length];
  const move = (direction: number) => { if (products.length > 1) setActive(current => (current + direction + products.length) % products.length); };
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/public/products", { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("Could not load products."); return response.json(); })
      .then(body => { setProducts(body.data.items); setActive(0); setLoadError(false); setLoading(false); })
      .catch(() => { if (!controller.signal.aborted) { setLoadError(true); setLoading(false); } });
    return () => controller.abort();
  }, [reload]);
  useEffect(()=>{
    let scrollFrame=0;
    const selectLinkedProduct=()=>{
      const anchor=window.location.hash.slice(1);
      const index=products.findIndex(item=>approvedProductAnchor(item.name)===anchor);
      if(index>=0){setActive(index);scrollFrame=requestAnimationFrame(()=>document.getElementById(anchor)?.scrollIntoView({block:"start"}));}
    };
    const initialFrame=requestAnimationFrame(selectLinkedProduct);
    window.addEventListener("hashchange",selectLinkedProduct);
    return()=>{cancelAnimationFrame(initialFrame);cancelAnimationFrame(scrollFrame);window.removeEventListener("hashchange",selectLinkedProduct);};
  },[products]);
  const showDialog = (content: typeof dialogContent) => {
    trigger.current = document.activeElement as HTMLElement;
    setDialogContent(content);
    setMenuOpen(false);
    dialog.current?.showModal();
  };

  return (
    <main className="hv-landing hv-products">
      <header className="products-header">
        <nav className="products-nav" aria-label="Main navigation">
          <Link href="/" className="products-home" aria-label="HexVault home"><LandingLogo /></Link>
          <div className="products-links" id="products-navigation" data-open={menuOpen}>
            <Link href="/products" aria-current="page" onClick={() => setMenuOpen(false)}>Products</Link>
            <Link href="/services">Services</Link>
            <Link href="/careers">Careers</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>

          </div>
          <Link href="/contact" className="products-project">Start a project <ArrowUpRight size={20} /></Link>
          <button className="products-menu" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="products-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </nav>
      </header>

      <section className="products-intro" aria-labelledby="products-title">
        <p className="products-eyebrow"><span>001</span><i aria-hidden="true" />Our products</p>
        <h1 id="products-title">Products Built for <span>Scale<span className="products-period">.</span></span></h1>
        <p className="products-subtitle">Tools and platforms engineered by HexVault to simplify,<br className="products-desktop-break" /> automate, and accelerate modern software teams.</p>
      </section>

      {loading ? <div className="products-empty" role="status">Loading products…</div> : loadError ? <div className="products-empty" role="alert"><h2>We couldn’t load the products.</h2><button onClick={() => { setLoading(true); setReload(value => value + 1); }}>Try again <ArrowRight size={18} /></button></div> : !product ? <div className="products-empty"><ProductMark /><h2>Our product ecosystem is taking shape.</h2><p>Explore the in-development and proposed products below. Contact us to confirm current availability.</p><Link href="/contact">Talk to our team <ArrowUpRight size={18} /></Link></div> : <section className="products-carousel" aria-label="Our products" aria-roledescription="carousel" tabIndex={0}
        onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); } }}
        onTouchStart={event => { touchStart.current = event.touches[0].clientX; }}
        onTouchEnd={event => { if (touchStart.current === null) return; const distance = touchStart.current - event.changedTouches[0].clientX; if (Math.abs(distance) > 60) move(distance > 0 ? 1 : -1); touchStart.current = null; }}
        onTouchCancel={() => { touchStart.current = null; }}>
        {products.length > 1 && <><div className="products-peek products-peek-left" aria-hidden="true"><ProductMark /><span>{previous.name}</span></div>
        <div className="products-peek products-peek-right" aria-hidden="true"><ProductMark /><span>{next.name}</span></div>
        <button className="products-arrow products-arrow-left" aria-label="Previous product" onClick={() => move(-1)}><ArrowLeft /></button></>}
        <div className="products-slide" aria-live="polite" aria-atomic="true">
          <article id={approvedProductAnchor(product.name)} className="products-card" key={product.id} aria-roledescription="slide" aria-label={`${active + 1} of ${products.length}: ${product.name}`}>
            <div className="products-art products-owner-art">
              {product.imageUrl ? <Image src={product.imageUrl} alt={product.imageAlt || product.name} width={800} height={800} unoptimized draggable={false} /> : <span className="products-image-placeholder" aria-hidden="true"><ProductMark /></span>}
            </div>
            <div className="products-content">
              <CompanyStatus status={approvedProductStatus(product.name)}/>
              <h2>{product.logoUrl ? <Image className="products-owner-logo" src={product.logoUrl} alt="" width={56} height={62} unoptimized /> : <ProductMark />}{product.name}</h2>
              <h3>{product.title}</h3>
              <p>{product.description}</p>
              {product.price !== null && <p className="products-price">{formatProductPrice(product)}</p>}
              {product.ctaUrl ? <a className="products-learn" href={product.ctaUrl}>{product.ctaLabel}<ArrowUpRight size={23} /></a> : <button className="products-learn" onClick={() => showDialog({ title: product.name, description: product.detail || product.description })}>{product.ctaLabel}<ArrowUpRight size={23} /></button>}
              {product.features.length > 0 && <dl className="products-metrics" style={{ gridTemplateColumns: `repeat(${product.features.length}, minmax(0, 1fr))` }}>{product.features.map(({ value, label }, index) => <div key={index}><dt>{value}</dt><dd>{label}</dd></div>)}</dl>}
            </div>
          </article>
        </div>
        {products.length > 1 && <><button className="products-arrow products-arrow-right" aria-label="Next product" onClick={() => move(1)}><ArrowRight /></button>
        <div className="products-pagination" aria-label="Choose a product">{products.map((item, index) => <button key={item.id} aria-label={`Show ${item.name}`} aria-current={active === index ? "true" : undefined} onClick={() => setActive(index)}><span /></button>)}</div></>}
      </section>}

      <CompanyProductRoadmap publishedNames={products.map(product=>product.name)}/>
      <LandingFooter/>
      <dialog ref={dialog} className="hv-info-dialog products-dialog" aria-labelledby="product-dialog-title" aria-describedby="product-dialog-description" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onClose={() => { if (trigger.current?.getClientRects().length) trigger.current.focus(); else document.querySelector<HTMLButtonElement>(".products-menu")?.focus(); }}>
        <div className="hv-dialog-content">
          <button className="hv-dialog-close" aria-label="Close details" onClick={() => dialog.current?.close()}><X size={20} /></button>
          <h2 id="product-dialog-title">{dialogContent.title}</h2>
          <p id="product-dialog-description">{dialogContent.description}</p>
          <Link href="/contact">Let’s talk about your project <ArrowUpRight size={17} /></Link>
        </div>
      </dialog>
    </main>
  );
}
