import type { InfoEntry } from "./types";

// Footer "Legal" column pages (summary drafts, need legal review).
export const legalPages = {
  terms: {
    title: "Terms of Service",
    description: "These terms govern use of HEXVAULT websites, Workforce OS and related services. This is a summary draft; the signed agreement for your engagement prevails.",
    sections: [
      {
        items: [
          {
            title: "Use of the service",
            text: "Use HEXVAULT only for lawful business purposes and keep your account credentials secure."
          },
          {
            title: "Your data",
            text: "You own the data you put into your workspace. We process it only to provide the service."
          },
          {
            title: "Availability",
            text: "We work to keep the service running reliably but do not guarantee uninterrupted access unless an SLA says so."
          },
          {
            title: "Changes and termination",
            text: "Either party may end the service with notice. We will tell you about material changes to these terms."
          },
          {
            title: "Contact",
            text: "Questions about these terms: contact.hexvault@gmail.com."
          }
        ]
      }
    ]
  },
  privacy: {
    title: "Privacy Policy",
    description: "How HEXVAULT handles personal information. This is a summary draft pending legal review.",
    sections: [
      {
        items: [
          {
            title: "What we collect",
            text: "Account details, workspace records such as attendance and leave, and messages you send us through the contact form."
          },
          {
            title: "How we use it",
            text: "To run the service, provide support and keep the platform secure. We do not sell personal data."
          },
          {
            title: "Access and retention",
            text: "Access is limited by role. Data is kept while your account is active or as the law requires."
          },
          {
            title: "Your rights",
            text: "You can ask to access, correct or delete your information by emailing contact.hexvault@gmail.com."
          }
        ]
      }
    ]
  },
  cookies: {
    title: "Cookie Policy",
    description: "We use only the cookies needed to run the site and keep you signed in.",
    sections: [
      {
        items: [
          {
            title: "Essential cookies",
            text: "Session cookies keep team members signed in and protect against misuse."
          },
          {
            title: "Analytics and advertising",
            text: "The public site does not use advertising cookies."
          },
          {
            title: "Your choices",
            text: "You can clear or block cookies in your browser; signing in may stop working if you do."
          }
        ]
      }
    ]
  },
  acceptable: {
    title: "Acceptable Use",
    description: "Rules for using HEXVAULT services responsibly.",
    sections: [
      {
        items: [
          {
            title: "Not allowed",
            text: "Illegal content, malware, attempts to break into other accounts or systems, and abuse of other users."
          },
          {
            title: "Resource use",
            text: "Do not overload the platform or bypass access controls and role limits."
          },
          {
            title: "Reporting",
            text: "Report suspected misuse to contact.hexvault@gmail.com. We may suspend accounts that break these rules."
          }
        ]
      }
    ]
  },
  dpa: {
    title: "Data Processing",
    description: "How we process customer data on your behalf.",
    sections: [
      {
        items: [
          {
            title: "Roles",
            text: "You are the controller of your workspace data and HEXVAULT acts as the processor."
          },
          {
            title: "Instructions and security",
            text: "We process data only on your instructions and protect it with role-based access and encrypted connections."
          },
          {
            title: "Sub-processors",
            text: "Hosting and storage providers may process data under written terms. Ask us for the current list."
          },
          {
            title: "Agreement",
            text: "A formal Data Processing Agreement is available on request."
          }
        ]
      }
    ],
    cta: {
      label: "Request a DPA",
      href: "/contact"
    }
  },
  sla: {
    title: "SLA",
    description: "Service levels are agreed per engagement, so we do not publish one fixed uptime figure.",
    sections: [
      {
        items: [
          {
            title: "Availability targets",
            text: "Set in your order form based on your plan."
          },
          {
            title: "Support response",
            text: "Priority and response times are defined for Enterprise engagements."
          },
          {
            title: "Incident updates",
            text: "We communicate outages by email and keep you informed until they are resolved."
          }
        ]
      }
    ],
    cta: {
      label: "Discuss an SLA",
      href: "/contact"
    }
  },
} satisfies Record<string, InfoEntry>;
