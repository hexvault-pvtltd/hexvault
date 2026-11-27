import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Braces, Check, Cloud, GitBranch, Layers3, MessageSquare, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import "./landing-body.css";
import { companyCopy } from "./shared/companyCopy";
import { websiteContent, websiteIntroduction } from "./shared/websiteContent";

const services = [
  { number: "01", icon: Braces, title: "Product engineering", description: "Web platforms, mobile experiences, and the systems behind them. Thoughtful software, from the first screen to the last integration.", tags: ["Web & mobile", "Platforms", "Integrations"], className: "product" },
  { number: "02", icon: Sparkles, title: "AI & automation", description: "Developing intelligent technology solutions that support productivity, automation and decision-making.", tags: ["Planned", "AI workflows", "Intelligent automation"], className: "automation" },
  { number: "03", icon: Cloud, title: "Cloud & DevOps", description: "Supporting reliable application deployment and scalable digital infrastructure as our technical capabilities expand.", tags: ["Expanding capabilities", "Cloud engineering", "Deployment"], className: "cloud" },
];
const steps = [
  { number: "01", title: "Start with the right questions.", text: "Tell us what you want to build, who it is for, and what is getting in the way. We shape the scope and next steps together." },
  { number: "02", title: "Build with a shared direction.", text: "Turn the plan into working software. Keep decisions visible, review progress together, and make room for useful feedback." },
  { number: "03", title: "Launch. Learn. Keep improving.", text: "Prepare for release, hand over the details, and plan the next iteration around how your product is actually used." },
];

function WorkflowPreview() {
  return <div className="hl-workspace" aria-label="Illustrative project workspace">
    <div className="hl-workspace-bar"><span className="hl-workspace-brand"><Layers3 size={17}/> Project workspace</span><span className="hl-example">Preview</span></div>
    <div className="hl-workspace-project"><div><span className="hl-mini-label">THE NEXT BUILD</span><h3>From concept to launch</h3></div><span className="hl-avatar-stack" aria-label="A shared team workspace"><span>PM</span><span>UI</span><span>DEV</span></span></div>
    <div className="hl-board">
      <div className="hl-board-column"><p><span/>To do <small>01</small></p><article><span className="hl-task-tag">Planning</span><h4>Map the product experience</h4><p>One clear starting point for the team.</p><div><GitBranch size={13}/><span>Product direction</span></div></article></div>
      <div className="hl-board-column"><p><span/>In progress <small>01</small></p><article className="hl-task-active"><span className="hl-task-tag">Engineering</span><h4>Build the core workflow</h4><p>Keep context connected to the work.</p><div><Braces size={13}/><span>Active development</span></div></article></div>
      <div className="hl-board-column"><p><span/>In review <small>01</small></p><article><span className="hl-task-tag">Review</span><h4>Review the experience together</h4><p>Feedback before the next release.</p><div><MessageSquare size={13}/><span>Team feedback</span></div></article></div>
    </div>
    <div className="hl-workspace-update"><span className="hl-update-icon"><Check size={14}/></span><p>A clear owner. A shared next step.</p><span>Built together</span></div>
  </div>;
}

export default function LandingBody() {
  return <div className="hl-body">
    <div className="hl-scroll-note" aria-hidden="true"><span>GOOD IDEAS DESERVE A GREAT BUILD</span><ArrowDown size={15}/></div>
    <section className="hl-section hl-company-intro" aria-labelledby="hl-company-title"><p className="hl-eyebrow"><span/>ABOUT HEXVAULT</p><h2 id="hl-company-title">Engineering technology<br/><span>with purpose.</span></h2><p>{companyCopy.introduction}</p><p>{websiteIntroduction[2]}</p><div className="hl-company-links"><Link href="/about" className="hl-text-link">About HEXVAULT <ArrowUpRight size={17}/></Link><Link href="/about#roadmap" className="hl-text-link">Our roadmap <ArrowUpRight size={17}/></Link><Link href="/about#identity" className="hl-text-link">Secure. Build. Innovate. <ArrowUpRight size={17}/></Link></div></section>

    <section className="hl-section hl-capabilities" id="capabilities" aria-labelledby="hl-capabilities-title">
      <div className="hl-section-heading"><div><p className="hl-eyebrow"><span/>WHAT WE BUILD</p><h2 id="hl-capabilities-title">Your next idea.<br/><span>Built to go further.</span></h2></div><p>From a new product to a better way of working, we bring design, engineering, and automation into one conversation.</p></div>
      <div className="hl-services">{services.map(({ number, icon: Icon, title, description, tags, className }) => <article className={`hl-service hl-service-${className}`} key={number}>
        <div className="hl-service-top"><span>{number} /</span><Icon size={25} strokeWidth={1.5} aria-hidden="true"/></div>
        <div className="hl-service-art" aria-hidden="true">{className === "product" ? <div className="hl-code-art"><span>&lt; build &gt;</span><i/><i/><i/><span>&lt; /together &gt;</span></div> : className === "automation" ? <div className="hl-flow-art"><span><MessageSquare size={22}/></span><i/><span><Sparkles size={26}/></span><i/><span><Check size={22}/></span></div> : <div className="hl-cloud-art"><span/><span/><span/><Cloud size={66} strokeWidth={1}/></div>}</div>
        <h3>{title}</h3><p>{description}</p><ul className="hl-service-tags" aria-label={`${title} services`}>{tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
        <Link className="hl-text-link" href={className === "product" ? "/services#software-development" : className === "automation" ? "/services#artificial-intelligence" : "/services#cloud-engineering"}>Explore service <ArrowUpRight size={17}/></Link>
      </article>)}</div>
      <Link href="/services" className="hl-text-link">Explore all services <ArrowUpRight size={17}/></Link>
    </section>

    <section className="hl-section hl-collaboration" id="why-hexvault" aria-labelledby="hl-collaboration-title">
      <div className="hl-collaboration-copy"><p className="hl-eyebrow"><span/>WHY HEXVAULT</p><h2 id="hl-collaboration-title">Great software.<br/><span>Built together.</span></h2><p>{websiteContent.why.blocks[0].paragraphs[0]} {websiteContent.why.blocks[1].paragraphs[0]}</p>
        <ul className="hl-principles"><li><span><Workflow size={18}/></span><div><h3>Keep the work connected</h3><p>Bring tasks, conversations, and project updates into the same workflow.</p></div></li><li><span><ShieldCheck size={18}/></span><div><h3>Give people the right access</h3><p>Clear roles and ownership help teams work with confidence.</p></div></li><li><span><GitBranch size={18}/></span><div><h3>Make progress reviewable</h3><p>Keep decisions and feedback close to the work they shape.</p></div></li></ul>
        <Link href="/about" className="hl-text-link">More about HEXVAULT <ArrowUpRight size={17}/></Link>
      </div><WorkflowPreview/>
    </section>

    <section className="hl-section hl-process" id="how-it-works" aria-labelledby="hl-process-title"><div className="hl-section-heading"><div><p className="hl-eyebrow"><span/>HOW WE WORK</p><h2 id="hl-process-title">Less guesswork.<br/><span>More forward motion.</span></h2></div><p>A clear scope, regular conversations, and working software you can review. Here is how we get there.</p></div>
      <ol className="hl-steps">{steps.map(step => <li key={step.number}><span className="hl-step-number">{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
      <Link href="/services#process" className="hl-text-link">Explore our process <ArrowUpRight size={17}/></Link>
    </section>

    <section className="hl-section hl-cta-section" id="pricing" aria-labelledby="hl-cta-title"><div className="hl-cta"><div className="hl-cta-glow" aria-hidden="true"/><div className="hl-cta-copy"><p className="hl-eyebrow"><span/>LET&apos;S BUILD SOMETHING USEFUL</p><h2 id="hl-cta-title">Build your next idea<br/><span>with HEXVAULT.</span></h2><p>Transform your business requirements into practical digital solutions.</p><div className="hl-cta-actions"><Link href="/contact#project-inquiry" className="hl-primary-link">Discuss your project <ArrowUpRight size={18}/></Link><Link href="/products" className="hl-secondary-link">Explore products <ArrowRight size={17}/></Link></div></div><div className="hl-cta-symbol" aria-hidden="true"><span/><span/><span/><span/></div></div></section>
  </div>;
}
