import { websiteContent, websiteIntroduction } from "./websiteContent";

export const companyCopy = {
 name:"HEXVAULT",
 motto:"SECURE • BUILD • INNOVATE",
 headline:"Delivering Solutions.",
 summary:websiteIntroduction[0],
 introduction:websiteIntroduction[1],
 purpose:websiteContent.purpose.paragraphs[0],
 ecosystem:websiteContent.vision.paragraphs[1],
 progress:websiteContent.about.paragraphs.at(-1)!,
 closing:"Engineering technology with purpose. Building solutions with responsibility. Innovating for the future.",
 footerDescription:"Building secure, scalable and innovative technology solutions for a digital future.",
 email:"contact.hexvault@gmail.com",
 linkedIn:"https://www.linkedin.com/company/hex-vault/",
} as const;
