import { mainPages } from "./main";
import { companyPages } from "./company";
import { resourcePages } from "./resources";
import { legalPages } from "./legal";

// All popup pages, keyed by name. Edit the text in the group files next to this one.
export const landingInfo = { ...mainPages, ...companyPages, ...resourcePages, ...legalPages };

export type LandingInfoKey = keyof typeof landingInfo;
export type OpenLandingInfo = (key: LandingInfoKey) => void;
export type { InfoEntry, InfoItem, InfoSection, InfoCta } from "./types";
export { landingProducts } from "./products";
