import { approvedProducts } from "./companyPages";
export const landingInfo = {
  products: { title: "Our products", description: "Product names and details will be added here." },
  pricing: { title: "Pricing", description: "Pricing details will be published here." },
  contact: { title: "Contact HEXVAULT", description: "Company contact details will be added here." },
  about: { title: "Why Hexvault", description: "Company information and benefits will be added here." },
  signup: { title: "Sign up for HEXVAULT", description: "Public registration is coming soon. Existing team members can sign in with their workspace account." },
  support: { title: "Support", description: "Support contact details will be added here." },
  terms: { title: "Terms of Service", description: "The company’s Terms of Service will be published here." },
  privacy: { title: "Privacy Policy", description: "The company’s Privacy Policy will be published here." },
  community: { title: "Community Guidelines", description: "Community guidelines will be published here." },
} as const;

export type LandingInfoKey = keyof typeof landingInfo;
export type OpenLandingInfo = (key: LandingInfoKey) => void;

// Owner-supplied product descriptions retain their development/proposal status.
export const landingProducts = approvedProducts.map(({content,href})=>({name:content.title,description:content.status??"Planned",href}));
