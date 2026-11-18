import type { InfoEntry } from "./types";

// Footer "Company" column pages.
export const companyPages = {
  aboutUs: {
    title: "About Us",
    description: "HEXVAULT is a remote-first engineering company building web, mobile, cloud and AI software, plus our own Workforce OS.",
    sections: [
      {
        items: [
          {
            title: "What we do",
            text: "Product engineering, DevOps and automation for teams that need dependable software."
          },
          {
            title: "How we work",
            text: "Small senior teams, written communication and honest estimates."
          },
          {
            title: "Where we are",
            text: "Remote first and working worldwide."
          }
        ]
      }
    ],
    cta: {
      label: "Contact us",
      href: "/contact"
    }
  },
  caseStudies: {
    title: "Case Studies",
    description: "Detailed write-ups are being prepared. These are the kinds of projects we deliver.",
    sections: [
      {
        items: [
          {
            title: "Workforce management",
            text: "Replacing spreadsheets with one workspace for attendance, leave and projects."
          },
          {
            title: "Hiring platforms",
            text: "Public careers pages connected to an applicant tracking board."
          },
          {
            title: "Cloud & DevOps",
            text: "Container deployments, CI/CD pipelines and database migrations."
          }
        ]
      }
    ],
    cta: {
      label: "Discuss your project",
      href: "/contact#project-inquiry"
    }
  },
  blog: {
    title: "Blog",
    description: "Engineering notes from the HEXVAULT team are coming soon.",
    sections: [
      {
        items: [
          {
            title: "What to expect",
            text: "Practical posts on architecture, DevOps, AI and building reliable software."
          },
          {
            title: "Stay in touch",
            text: "Email contact.hexvault@gmail.com to be told when we publish."
          }
        ]
      }
    ]
  },
  contact: {
    title: "Contact HEXVAULT",
    description: "Email contact.hexvault@gmail.com or message us on WhatsApp at +91 99955 333576. We work remotely and reply to every enquiry."
  },
} satisfies Record<string, InfoEntry>;
