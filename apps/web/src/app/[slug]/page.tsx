import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import LandingNavbar from "@/components/landing/navigation/LandingNavbar";
import LandingFooter from "@/components/landing/footer/LandingFooter";
import { publicPages } from "@/components/landing/shared/publicPages";
import CompanyContent from "@/components/landing/shared/CompanyContent";
import "@/styles/landing.css";
import "./public-page.css";

type Props = { params: Promise<{ slug: string }> };
function getPage(slug: string) {
  return Object.hasOwn(publicPages, slug) ? publicPages[slug] : undefined;
}

export function generateStaticParams() {
  return Object.keys(publicPages).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getPage((await params).slug);
  return page ? { title: `${page.title} | HEXVAULT`, description: page.description } : {};
}

export default async function PublicPage({ params }: Props) {
  const page = getPage((await params).slug);
  if (!page) notFound();
  return <div className="hv-landing hv-public-page">
    <LandingNavbar />
    <main className="hp-content">
      <nav className="hp-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>{page.category}</span></nav>
      <header className="hp-intro"><p className="hp-eyebrow">{page.category}</p><h1>{page.title}</h1><p>{page.description}</p></header>
      {page.content?<CompanyContent content={page.content} skipFirstParagraph cardLinks={page.cardLinks} faq={page.faq}/>:<div className="hp-sections">{page.sections.map((section, index) => <section className="hp-section" key={section.title}><span className="hp-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><h2>{section.title}</h2><p>{section.text}</p></div></section>)}</div>}
      {page.related && <nav className="hp-related" aria-label="Related pages">{page.related.map(link => <Link key={link.href} href={link.href}>{link.label}<ArrowUpRight size={18} /></Link>)}</nav>}
      <section className="hp-cta"><div><p className="hp-eyebrow">LET&apos;S TALK</p><h2>Have a question or a project in mind?</h2></div><Link className="hv-action hv-action-primary" href="/contact">Contact our team <ArrowUpRight size={18}/></Link></section>
    </main>
    <LandingFooter />
  </div>;
}
