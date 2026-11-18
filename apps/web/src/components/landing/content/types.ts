export type InfoItem = { title: string; text: string };
export type InfoSection = { heading?: string; items: InfoItem[] };
export type InfoCta = { label: string; href: string };
export type InfoEntry = { title: string; description: string; sections?: InfoSection[]; cta?: InfoCta; wide?: boolean };
