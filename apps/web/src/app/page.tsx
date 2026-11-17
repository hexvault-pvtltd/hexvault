import Image from "next/image";
import Link from "next/link";
import "./landing.css";

const capabilities = [
  { number: "01", title: "People, connected", description: "Bring employee profiles, teams, and reporting lines into one clear workspace." },
  { number: "02", title: "Work, in motion", description: "Keep projects, tasks, and daily updates moving with the people responsible." },
  { number: "03", title: "The whole picture", description: "See attendance, leave, and team activity together, with access shaped by role." },
];

export default function Home() {
  return (
    <main className="landing-shell">
      <div className="landing-grain" aria-hidden="true" />
      <header className="landing-nav-wrap">
        <nav className="landing-nav" aria-label="Main navigation">
          <Link href="/" className="landing-brand" aria-label="HEXVAULT home">
            <Image src="/brand/hexvault-logo.png" alt="" width={56} height={56} priority />
            <span>HEXVAULT</span>
          </Link>
          <div className="landing-links">
            <a href="#platform">Platform</a>
            <a href="#why-hexvault">Why HEXVAULT</a>
            <Link href="/careers">Careers</Link>
          </div>
          <Link className="landing-nav-cta" href="/login">Open workspace <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-wordmark" aria-hidden="true">HEXVAULT</div>
        <div className="landing-particle-field" aria-hidden="true"><span /><span /><span /></div>
        <div className="landing-hero-content">
          <p className="landing-eyebrow"><span /> Workforce, working together</p>
          <h1 id="hero-title">People first.<br /><span>Work in sync.</span></h1>
          <p className="landing-hero-copy">One clear space to bring your people, projects, and everyday operations together.</p>
          <div className="landing-actions">
            <Link href="/login" className="landing-button landing-button-primary">Open your workspace <span aria-hidden="true">↗</span></Link>
            <Link href="/careers" className="landing-button landing-button-quiet">Explore careers <span aria-hidden="true">→</span></Link>
          </div>
          <a href="#platform" className="landing-scroll-cue"><span /> Explore the platform</a>
        </div>
        <div className="landing-hero-footer"><span>HEXVAULT WORKFORCE</span><span>PEOPLE · OPERATIONS · PROGRESS</span><span>BUILT TO MOVE WORK FORWARD <b>✳</b></span></div>
      </section>

      <section id="platform" className="landing-platform">
        <div className="landing-section-heading">
          <p className="landing-eyebrow"><span /> One connected workspace</p>
          <h2>Everything your team needs<br /><em>to do its best work.</em></h2>
          <p>HEXVAULT gives every team a shared view of the people and work that keep your organization moving.</p>
        </div>
        <div className="landing-capabilities">
          {capabilities.map((item) => <article className="landing-capability" key={item.number}>
            <span className="landing-capability-number">{item.number}</span>
            <div><h3>{item.title}</h3><p>{item.description}</p></div>
            <span className="landing-capability-arrow" aria-hidden="true">↗</span>
          </article>)}
        </div>
      </section>

      <section id="why-hexvault" className="landing-close">
        <div><p className="landing-eyebrow"><span /> A clearer way to work</p><h2>Make room for<br /><em>meaningful progress.</em></h2></div>
        <div className="landing-close-action"><p>Give your people the clarity to focus, collaborate, and move forward together.</p><Link href="/login" className="landing-button landing-button-primary">Go to HEXVAULT <span aria-hidden="true">↗</span></Link></div>
      </section>

      <footer className="landing-footer"><Link href="/" className="landing-footer-brand" aria-label="HEXVAULT home"><Image src="/brand/hexvault-logo.png" alt="" width={48} height={48} /><span>HEXVAULT</span></Link><span>People and work, together.</span><div><Link href="/careers">Careers</Link><Link href="/login">Team login</Link><span>© {new Date().getFullYear()} HEXVAULT</span></div></footer>
    </main>
  );
}
