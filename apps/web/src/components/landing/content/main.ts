import type { InfoEntry } from "./types";

// Navbar pages: Products, Pricing, Partners, Why Hexvault, Sign up.
export const mainPages = {
  products: {
    title: "Our products",
    description: "HEXVAULT Workforce OS is one workspace for running people, projects and payroll-adjacent operations, from the first hire to the last day.",
    wide: true,
    sections: [
      {
        items: [
          {
            title: "Attendance & shifts",
            text: "Clock-in sessions, shift assignments, holidays and attendance corrections with an approval trail."
          },
          {
            title: "Leave management",
            text: "Leave policies, balances and requests that managers approve in a single queue."
          },
          {
            title: "Projects & tasks",
            text: "Project membership, task assignees, dependencies, comments and review workflows."
          },
          {
            title: "People & lifecycle",
            text: "Employee profiles, invitations, documents, onboarding, offboarding and former-member records."
          },
          {
            title: "Performance & work logs",
            text: "Work journals, performance reviews and management notes kept in one place."
          },
          {
            title: "Careers & hiring",
            text: "A public careers page with job postings and an applicant tracking board for HR."
          },
          {
            title: "Team chat & voice",
            text: "Member chat with images and audio plus voice calls, so teams talk where they work."
          },
          {
            title: "CDN & file storage",
            text: "Controlled file delivery with role-based access for company assets."
          }
        ]
      }
    ],
    cta: {
      label: "Talk to us about Workforce OS",
      href: "/contact#project-inquiry"
    }
  },
  pricing: {
    title: "Pricing",
    description: "Every company is set up differently, so we quote by team size and scope. There are no hidden fees, and you pay only for what you use.",
    wide: true,
    sections: [
      {
        items: [
          {
            title: "Starter",
            text: "For small teams getting organised. Attendance, leave, tasks and the employee directory."
          },
          {
            title: "Growth",
            text: "For growing companies. Everything in Starter plus performance, hiring, chat and shifts."
          },
          {
            title: "Enterprise",
            text: "For larger organisations. Custom roles, CDN access, dedicated onboarding and priority support."
          }
        ]
      },
      {
        heading: "Custom engineering",
        items: [
          {
            title: "Project-based",
            text: "Web, mobile, cloud and AI projects are scoped and quoted after a short discovery call."
          }
        ]
      }
    ],
    cta: {
      label: "Request a quote",
      href: "/contact#project-inquiry"
    }
  },
  partners: {
    title: "Partners",
    description: "We work with companies that share our standard for software that holds up in production.",
    sections: [
      {
        items: [
          {
            title: "Technology partners",
            text: "Cloud, infrastructure and tooling providers we integrate with and build on."
          },
          {
            title: "Agency & consulting partners",
            text: "Studios and consultancies that bring us in for engineering depth on client projects."
          },
          {
            title: "Referral partners",
            text: "Introduce a team that needs Workforce OS or custom software and build a long-term relationship with us."
          }
        ]
      }
    ],
    cta: {
      label: "Become a partner",
      href: "/contact#project-inquiry"
    }
  },
  about: {
    title: "Why Hexvault",
    description: "Engineering software that holds. We build resilient, readable and scalable systems for real-world impact.",
    sections: [
      {
        items: [
          {
            title: "Built to last",
            text: "Clear architecture, tested code and migrations you can trust in production."
          },
          {
            title: "One workspace",
            text: "People, projects and attendance share the same data, so nothing is re-entered."
          },
          {
            title: "Role-aware by design",
            text: "Owners, HR, managers and staff each see only what their role allows."
          },
          {
            title: "Remote-first team",
            text: "We work worldwide and communicate in writing, with fast and honest updates."
          },
          {
            title: "Direct access",
            text: "You talk to the engineers building your product, not a layer of account managers."
          }
        ]
      }
    ],
    cta: {
      label: "Start a conversation",
      href: "/contact"
    }
  },
  signup: {
    title: "Sign up for HEXVAULT",
    description: "Public registration is coming soon. Existing team members can sign in with their workspace account."
  },
} satisfies Record<string, InfoEntry>;
