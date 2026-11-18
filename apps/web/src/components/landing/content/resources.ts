import type { InfoEntry } from "./types";

// Footer "Resources" column and navbar Resources dropdown pages.
export const resourcePages = {
  support: {
    title: "Support",
    description: "Stuck or have a question? Reach the team directly and we will get back to you.",
    sections: [
      {
        items: [
          {
            title: "Email",
            text: "contact.hexvault@gmail.com"
          },
          {
            title: "WhatsApp",
            text: "+91 99955 333576"
          },
          {
            title: "Existing workspaces",
            text: "Team members can also ask their HR or workspace owner to raise an issue on their behalf."
          }
        ]
      }
    ],
    cta: {
      label: "Open the contact page",
      href: "/contact"
    }
  },
  docs: {
    title: "Documentation",
    description: "Product documentation is shared with customers during onboarding.",
    sections: [
      {
        items: [
          {
            title: "Workspace guides",
            text: "Setup for roles, departments, shifts, leave policies and invitations."
          },
          {
            title: "Deployment",
            text: "Docker and Render instructions come with the project repository."
          }
        ]
      }
    ],
    cta: {
      label: "Request access",
      href: "/contact"
    }
  },
  guides: {
    title: "Guides",
    description: "Short how-tos for common workspace tasks.",
    sections: [
      {
        items: [
          {
            title: "Invite your team",
            text: "Add an employee, send the invitation and assign a role and department."
          },
          {
            title: "Set up attendance",
            text: "Create shifts and holidays, then review corrections in the approval queue."
          },
          {
            title: "Run a hiring round",
            text: "Publish a job, collect applications and move candidates through the board."
          }
        ]
      }
    ]
  },
  api: {
    title: "API Reference",
    description: "Workforce OS exposes a versioned REST API under /api/v1.",
    sections: [
      {
        items: [
          {
            title: "Authentication",
            text: "Sign in with login, then use the session for requests. Password reset and session management endpoints are included."
          },
          {
            title: "Resources",
            text: "Employees, departments, invitations and notifications, with more endpoints added over time."
          },
          {
            title: "Full reference",
            text: "The detailed reference is available to customers on request."
          }
        ]
      }
    ],
    cta: {
      label: "Ask for API access",
      href: "/contact"
    }
  },
  status: {
    title: "Status",
    description: "Check whether the HEXVAULT service is responding.",
    sections: [
      {
        items: [
          {
            title: "Health check",
            text: "The live health endpoint reports whether the web service is up."
          },
          {
            title: "Incidents",
            text: "Outages are announced by email to affected customers."
          }
        ]
      }
    ],
    cta: {
      label: "Open health check",
      href: "/healthz"
    }
  },
  community: {
    title: "Community Guidelines",
    description: "Our shared workspace and public channels work best when everyone follows a few simple rules.",
    sections: [
      {
        items: [
          {
            title: "Be respectful",
            text: "Treat colleagues, candidates and partners with courtesy. Harassment and discrimination are not tolerated."
          },
          {
            title: "Protect information",
            text: "Keep employee, client and company data confidential and share it only with people who need it."
          },
          {
            title: "Communicate honestly",
            text: "Give accurate updates, own mistakes and raise problems early."
          },
          {
            title: "Use the tools properly",
            text: "Use chat, files and the CDN for work, and report anything that looks unsafe."
          }
        ]
      }
    ]
  },
} satisfies Record<string, InfoEntry>;
