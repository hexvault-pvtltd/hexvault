import Link from "next/link";
import { ChevronDown } from "lucide-react";
import LandingLogo from "../shared/LandingLogo";
import { companyCopy } from "../shared/companyCopy";
import { websiteContent } from "../shared/websiteContent";
import { approvedProducts } from "../shared/companyPages";
import "./footer.css";

type Entry = { label: string; href: string };
const destinations:Record<string,string>={"About Us":"/about","Our Purpose":"/purpose","Our Vision":"/vision","Our Mission":"/mission","Our Values":"/values","Our Teams":"/our-teams","Careers":"/careers","Contact":"/contact","Software Development":"/software-development","Web Development":"/web-development","Mobile Development":"/mobile-development","UI/UX Design":"/ui-ux-design","Enterprise Solutions":"/enterprise-solutions","Business Automation":"/business-automation","Cybersecurity":"/cybersecurity","Artificial Intelligence":"/artificial-intelligence","Cloud and DevOps":"/cloud-engineering","IT Consulting":"/it-consulting","Blog":"/blog","Documentation":"/documentation","Developer Resources":"/developer-resources","Research":"/research","Case Studies":"/case-studies","Product Updates":"/product-updates","FAQs":"/faq","Help Centre":"/support","Privacy Policy":"/privacy","Terms of Service":"/terms","Cookie Policy":"/cookies","Security Policy":"/security","Acceptable Use Policy":"/acceptable-use","Responsible Disclosure Policy":"/responsible-disclosure",...Object.fromEntries(approvedProducts.map(({content,href})=>[content.title,href]))};
const groups:{title:string;entries:Entry[]}[]=websiteContent.footer.blocks[0].blocks.filter(block=>block.title!=="Connect").map(block=>({title:block.title,entries:block.items.map(label=>({label,href:destinations[label]}))}));

function SocialMarks(){return <div className="hf-social"><a href={companyCopy.linkedIn} target="_blank" rel="noopener noreferrer" aria-label="HEXVAULT on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="3"/><text x="3" y="19" fill="#121316" fontSize="20" fontFamily="Arial" fontWeight="bold">in</text></svg></a></div>;}

export default function LandingFooter({ showFaq = false }: { showFaq?: boolean }) {
  return <footer className={`hv-site-footer${showFaq ? " hv-site-footer-with-faq" : ""}`}>
    {showFaq&&<section className="hf-faq" aria-label="Frequently asked questions">{[0,1,3,10].map(index=>{const question=websiteContent.faq.blocks[index];return <details key={question.title}><summary>{question.title}<ChevronDown/></summary>{question.paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</details>;})}<Link href="/faq" className="hf-all-faq">Read all FAQs <span aria-hidden="true">↗</span></Link></section>}
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
    <aside className="hf-availability"><p>{websiteContent.availability.paragraphs[1]}</p><Link href="/availability">Product and service availability</Link></aside>
    <svg className="hf-watermark" aria-hidden="true" viewBox="0 0 1400 195"><defs><linearGradient id="hf-ink" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#28282a"/><stop offset="1" stopColor="#131417"/></linearGradient></defs><text x="0" y="179" textLength="1400" lengthAdjust="spacingAndGlyphs" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="250" fill="url(#hf-ink)">HEXVAULT</text></svg>
  </footer>;
}
