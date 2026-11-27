"use client";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, ChevronDown, Mail, MapPin } from "lucide-react";
import ParticleBackground from "@/components/landing/background/ParticleBackground";
import { companyCopy } from "@/components/landing/shared/companyCopy";
import LandingFooter from "@/components/landing/footer/LandingFooter";
const email = companyCopy.email;
export default function ContactPage() {
  const [draft, setDraft] = useState("");
  function compose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = ["name", "email", "company", "phone"].map(key => data.get(key)).filter(Boolean).join("\n")
      + "\n\n" + data.get("project");
    const url = "mailto:" + email + "?subject=" + encodeURIComponent("Project inquiry - " + data.get("service"))
      + "&body=" + encodeURIComponent(body);
    setDraft(url);
    window.location.href = url;
  }
  return <div className="hv-contact hv-landing">
    <div className="contact-upper">
    <ParticleBackground className="contact-particles" config={{ particleCount: 52000, particleSize: 0.85, particleOpacity: 0.78, waveAmplitude: 0.78, glowIntensity: 0.42 }} />
    <main className="contact-panel">
      <a href="/dashboard" className="contact-dashboard"><ArrowLeft size={17}/> Back to dashboard</a>
      <div className="contact-intro">
        <span>Get in touch</span>
        <h1>Let&apos;s Build Something Meaningful.</h1>
        <p>Have a software idea, business challenge or technology requirement? Connect with HEXVAULT to explore how technology can transform your ideas into practical digital solutions.</p>
      </div>
      <nav className="contact-views" aria-label="Contact sections">
        <a href="#next-steps">Contact details</a>
        <a className="contact-back" href="#project-inquiry" aria-label="Back to project inquiry"><ArrowLeft size={17}/> Back</a>
      </nav>
      <div className="contact-columns">
        <form id="project-inquiry" aria-label="Project inquiry" onSubmit={compose} onChange={() => setDraft("")}>
          <input id="full-name" aria-label="Full name" name="name" autoComplete="name" placeholder="Full name" required maxLength={100}/>
          <input aria-label="Work email" name="email" type="email" autoComplete="email" placeholder="Work email" required maxLength={254}/>
          <input aria-label="Company" name="company" autoComplete="organization" placeholder="Company" maxLength={120}/>
          <input aria-label="Phone number" name="phone" type="tel" autoComplete="tel" placeholder="Phone number" maxLength={40}/>
          <div className="contact-select"><select aria-label="What are you looking for?" name="service" required defaultValue=""><option value="" disabled>What are you looking for?</option><option>Business Enquiries</option><option>Product Enquiries</option><option>Partnership Enquiries</option><option>Career Enquiries</option><option>Technical Support</option></select><ChevronDown size={17}/></div>
          <textarea aria-label="Tell us about your project" name="project" placeholder="Tell us about your project" required maxLength={3000}/>
          <button className="contact-cta" type="submit">Send message <ArrowUpRight size={18}/></button>
          {draft && <p className="contact-status" role="status">Send the draft from your email app to complete your inquiry. <a href={draft}>Open email draft</a></p>}
        </form>
        <aside id="next-steps" className="contact-details"><h2>Contact us</h2>
          <a href={"mailto:" + email}><span><Mail size={19}/></span><div><h3>Email us</h3><p>{email}</p></div></a>
          <a href={companyCopy.linkedIn} target="_blank" rel="noopener noreferrer"><span><ArrowUpRight size={19}/></span><div><h3>LinkedIn</h3><p>HEXVAULT company page</p></div></a>
          <div className="contact-location"><span><MapPin size={19}/></span><div><h3>Global enquiries</h3><p>Project availability is confirmed individually.</p></div></div>
        </aside>
      </div>
    </main>
    </div>
    <LandingFooter/>
  </div>;
}
