import Link from "next/link";
import { ChevronDown } from "lucide-react";
import LandingLogo from "../shared/LandingLogo";
import { companyCopy } from "../shared/companyCopy";
import { websiteContent } from "../shared/websiteContent";
import { mainNavigation } from "../shared/siteStructure";
import "./footer.css";

type Entry = { label: string; href: string };
const groups:{title:string;entries:Entry[]}[]=[{title:"Explore",entries:mainNavigation},{title:"Information",entries:[{label:"FAQs",href:"/#faq"},{label:"Privacy Policy",href:"/privacy"},{label:"Terms of Service",href:"/terms"}]}];

function SocialMarks(){return <div className="hf-social"><a href={companyCopy.linkedIn} target="_blank" rel="noopener noreferrer" aria-label="HEXVAULT on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="3"/><text x="3" y="19" fill="#121316" fontSize="20" fontFamily="Arial" fontWeight="bold">in</text></svg></a></div>;}

export default function LandingFooter({ showFaq = false }: { showFaq?: boolean }) {
  return <footer className={`hv-site-footer${showFaq ? " hv-site-footer-with-faq" : ""}`}>
    {showFaq&&<section id="faq" className="hf-faq" aria-label="Frequently asked questions">{[0,1,3,10].map(index=>{const question=websiteContent.faq.blocks[index];return <details key={question.title}><summary>{question.title}<ChevronDown/></summary>{question.paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</details>;})}<details className="hf-more-faq"><summary>More questions<ChevronDown/></summary>{websiteContent.faq.blocks.filter((_,index)=>![0,1,3,10].includes(index)).map(question=><details key={question.title}><summary>{question.title}<ChevronDown/></summary>{question.paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</details>)}</details></section>}
    <div className="hf-grid">
      <div className="hf-brand">
        <Link href="/" aria-label="HEXVAULT home"><LandingLogo /></Link>
        <p className="hf-tagline">{companyCopy.motto}</p>
        <p className="hf-description">{companyCopy.headline} {companyCopy.footerDescription}</p><a className="hf-email" href={"mailto:"+companyCopy.email}>{companyCopy.email}</a>
        <SocialMarks />
        <Link href="/login" className="hf-team-login">Team Login <span aria-hidden="true">↗</span></Link>
      </div>
      {groups.map(({ title, entries }) => <section key={title} className="hf-column"><h2>{title}</h2><ul>{entries.map(({ label, href }) => <li key={label}><Link href={href}>{label}</Link></li>)}</ul></section>)}
      <p className="hf-copyright">© HexVault Technologies {new Date().getFullYear()} · All rights reserved.</p>
    </div>
    <aside className="hf-availability"><p>{websiteContent.availability.paragraphs[1]}</p><Link href="/products#availability">Product and service availability</Link></aside>
    <svg className="hf-watermark" aria-hidden="true" viewBox="0 0 1400 195"><defs><linearGradient id="hf-ink" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#28282a"/><stop offset="1" stopColor="#131417"/></linearGradient></defs><text x="0" y="179" textLength="1400" lengthAdjust="spacingAndGlyphs" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="250" fill="url(#hf-ink)">HEXVAULT</text></svg>
  </footer>;
}
