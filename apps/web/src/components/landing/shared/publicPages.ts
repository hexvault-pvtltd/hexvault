export type PublicPage = {
  category: string;
  title: string;
  description: string;
  sections: { title: string; text: string }[];
  related?: { label: string; href: string }[];
};

function service(title: string, description: string, focus: string, delivery: string): PublicPage {
  return { category: "Services", title, description, sections: [
    { title: "What we can build", text: focus },
    { title: "How we approach delivery", text: delivery },
    { title: "Start with your requirements", text: "Share your goals, existing systems, and target timeline. We can discuss the scope, dependencies, and a practical next step before preparing an estimate." },
  ], related: [{ label: "Our process", href: "/process" }, { label: "Explore products", href: "/products" }] };
}

function publication(title: string, description: string, detail: string): PublicPage {
  return { category: "Resources", title, description, sections: [
    { title: "Publication status", text: detail },
    { title: "Need something specific?", text: "Contact our team with the product or project name and the information you need. Please leave passwords, private keys, and other credentials out of your inquiry." },
  ] };
}

function policy(title: string, detail: string): PublicPage {
  return { category: "Legal", title, description: detail, sections: [
    { title: "Publication status", text: `The ${title} has not been published on this website yet. This page is a place to find its publication status and request the relevant document.` },
    { title: "Request the applicable document", text: "Contact our team with your organization name and the product or service you are considering. Ask for the applicable written terms before making a decision that depends on them." },
  ] };
}

export const publicPages: Record<string, PublicPage> = {
  "web-development": service("Web Development", "Web experiences built around the people who use them.", "Customer-facing websites, internal portals, dashboards, and connected web applications. We shape the interface and the systems behind it around your actual workflow.", "We begin with the key user journeys, then plan the interface, data model, and integrations. Reviewable milestones keep feedback close to the implementation."),
  "mobile-development": service("Mobile Development", "Take your product into the everyday workflows of mobile users.", "Mobile experiences for customers and teams, from initial product flows to connected app features. Scope can include account access, forms, notifications, and integrations.", "We clarify the target devices, platforms, and connectivity needs first. Those decisions guide the implementation, testing, and release plan."),
  "cloud-engineering": service("Cloud Engineering", "A dependable foundation for your software.", "Application hosting, storage, environment configuration, and infrastructure planning. We help connect the pieces your product needs to run and grow.", "We review your workloads, access requirements, and operating constraints. The plan covers deployment, monitoring needs, and the responsibilities of the team maintaining the system."),
  devops: service("DevOps", "Make delivery a repeatable part of building software.", "Build and deployment pipelines, environment management, release workflows, and operational tooling. Keep the path from a code change to a release understandable.", "We start with your current delivery process, identify manual bottlenecks, and agree on checks and release steps that suit your team."),
  "ai-automation": service("AI & Automation", "Turn repetitive steps into practical, connected workflows.", "AI-assisted workflows, connected tools, and task automation. We focus on a defined use case with clear inputs, useful outputs, and an understandable review step.", "We discuss the data involved, permissions, and how success will be evaluated. A focused first version helps establish where automation adds value and where human review is needed."),
  "product-engineering": service("Product Engineering", "From an early idea to working software your team can build on.", "Product discovery, interface design, application development, and integrations. We bring the product experience and technical foundations into one plan.", "We define the first useful release together, then build in reviewable steps. Launch preparation and handover are part of the delivery conversation."),
  about: {
    category: "Company", title: "Great software. Built together.",
    description: "HEXVAULT brings design, engineering, and automation into one conversation. We build resilient, readable, and scalable systems for real-world work.",
    sections: [
      { title: "Keep the work connected", text: "Software delivery involves people, decisions, and context. We aim to keep tasks, conversations, and project updates connected so everyone can understand the next step." },
      { title: "Clear ownership", text: "Defined responsibilities and appropriate access help a team collaborate. We discuss the roles, review process, and operational responsibilities a project needs." },
      { title: "Progress you can review", text: "Working software gives a team something concrete to assess. Shared milestones and regular feedback guide the next iteration." },
    ], related: [{ label: "How we work", href: "/process" }, { label: "Careers", href: "/careers" }],
  },
  process: {
    category: "Company", title: "From the first question to the next release.", description: "A clear scope, regular conversations, and working software you can review.",
    sections: [
      { title: "01 / Understand the problem", text: "Tell us what you want to build, who it is for, and what is getting in the way. Together we define priorities, constraints, and the first useful outcome." },
      { title: "02 / Build with a shared direction", text: "Turn the plan into working software. Keep decisions visible, review milestones, and use feedback to guide the next step." },
      { title: "03 / Launch and improve", text: "Prepare the release, document the handover, and discuss operational ownership. Plan the next iteration around how the product is actually used." },
    ], related: [{ label: "Explore services", href: "/services" }, { label: "Discuss pricing", href: "/pricing" }],
  },
  services: {
    category: "Services", title: "Your next idea. Built to go further.", description: "Explore the engineering services behind your next product or workflow.",
    sections: [{ title: "One connected conversation", text: "From the first interface to the infrastructure behind it, the scope starts with what your team needs to achieve. Explore a service below or talk to us about a project that spans several areas." }],
    related: ["web-development", "mobile-development", "cloud-engineering", "devops", "ai-automation", "product-engineering"].map(slug => ({ label: slug.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" "), href: `/${slug}` })),
  },
  pricing: {
    category: "Pricing", title: "Pricing around what you need to build.", description: "Discuss the scope, timeline, and delivery needs of your project with our team.",
    sections: [
      { title: "Project estimates", text: "There is no published fixed price list for custom engineering services. An estimate depends on the features, integrations, existing systems, and delivery requirements of the project." },
      { title: "Prepare for the conversation", text: "Share the problem you want to solve, the users involved, your priorities, and any target launch date. An existing brief, prototype, or feature list can help make the discussion concrete." },
      { title: "Product pricing", text: "Published product prices, where available, appear in our product catalog. Contact the team if you need clarification about a product or its commercial terms." },
    ], related: [{ label: "Browse products", href: "/products" }, { label: "Our process", href: "/process" }],
  },
  support: {
    category: "Resources", title: "How can we help?", description: "Find the next step for a workspace question or project inquiry.",
    sections: [
      { title: "Workspace access", text: "Existing team members can use Team Login. If you have forgotten your password, use the password reset option on the login screen. For an invitation or access issue, contact your organization administrator." },
      { title: "Report an issue", text: "Describe what you were trying to do, what happened, and when it happened. Include the page or product name and the error message, if available. Do not include passwords or credentials." },
      { title: "Project questions", text: "For a current engagement, include the project name and the decision or blocker you need help with. New project inquiries can be sent through our contact page." },
    ], related: [{ label: "Team Login", href: "/login" }, { label: "Documentation", href: "/documentation" }],
  },
  documentation: publication("Documentation", "A home for HEXVAULT product and workspace documentation.", "A public documentation library is not available yet. For product-specific setup or usage information, contact the team with the product name and what you want to accomplish."),
  guides: {
    category: "Resources", title: "Start your next project with a clearer brief.", description: "A practical starting point for your first conversation with HEXVAULT.",
    sections: [
      { title: "Describe the outcome", text: "Explain the problem, who experiences it, and what a useful result would look like. Prioritize the workflows that matter for the first release." },
      { title: "Map the constraints", text: "List existing systems, required integrations, target devices, and any data or access requirements. Identify the people who will review decisions." },
      { title: "Bring the starting material", text: "Share an existing brief, sketches, examples, or a feature list if you have them. Include a target timeline and budget range when available so the team can discuss a realistic scope." },
    ], related: [{ label: "Our process", href: "/process" }, { label: "Pricing", href: "/pricing" }],
  },
  "api-reference": publication("API Reference", "Integration information for HEXVAULT products.", "A public API reference is not published yet. Ask the team about the specific product and integration you are planning before relying on an endpoint or authentication method."),
  status: publication("Service Status", "Find out how to request information about a service issue.", "A live public status feed is not connected to this page. It does not report uptime or confirm service availability. If you are experiencing an issue, contact the team with the product name, time, and symptoms."),
  security: {
    category: "Resources", title: "Discuss your security requirements.", description: "Bring access, data handling, and operational requirements into the project conversation early.",
    sections: [
      { title: "Project requirements", text: "Tell us about the data involved, the roles that need access, and your organization's requirements. Confirm the applicable controls and responsibilities in the project agreement." },
      { title: "Questions about data", text: "For questions about prompt history, retention, storage, or product-specific access controls, contact the team with the product name. Public policy documents and certifications are not provided on this page." },
      { title: "Report a concern", text: "Use the contact page to report a suspected issue. Describe the affected product and impact without including credentials, personal data, or exploitable details in the initial message." },
    ], related: [{ label: "Privacy Policy", href: "/privacy" }, { label: "Data Processing", href: "/data-processing" }],
  },
  "case-studies": publication("Case Studies", "A place for the work behind the outcomes.", "Public case studies have not been published yet. Contact the team to discuss relevant experience for the kind of project you are planning."),
  blog: publication("The HEXVAULT Blog", "Notes on building products, connected workflows, and software delivery.", "There are no published blog articles yet. Explore our services and process pages for an introduction to how we approach projects."),
  community: publication("Community Guidelines", "Information for participating in HEXVAULT community spaces.", "Public community guidelines and community access details have not been published yet. Contact the team if you are looking for a specific community space."),
  signup: {
    category: "Get started", title: "Build your next step with HEXVAULT.", description: "Public self-service registration is coming soon. Talk to us about your project or sign in to an existing workspace.",
    sections: [{ title: "Already on the team?", text: "Use Team Login to access your workspace account. If you have been invited, follow the account setup link in your invitation." }, { title: "Starting something new?", text: "Tell us about the product, workflow, or challenge you want to work on. Our contact page is the starting point for discussing requirements and next steps." }],
    related: [{ label: "Team Login", href: "/login" }, { label: "Explore products", href: "/products" }],
  },
  privacy: policy("Privacy Policy", "Information about the publication of HEXVAULT's privacy policy."),
  terms: policy("Terms of Service", "Information about the terms applicable to HEXVAULT products and services."),
  cookies: policy("Cookie Policy", "Information about the publication of cookie disclosures."),
  "acceptable-use": policy("Acceptable Use Policy", "Information about permitted use requirements for HEXVAULT services."),
  "data-processing": policy("Data Processing Agreement", "Information about requesting data processing terms for your engagement."),
  sla: policy("Service Level Agreement", "Information about requesting service commitments for your engagement."),
};
