import type { PublicPage } from "./publicPages";
import { websiteContent, type CompanyBlock } from "./websiteContent";

export const serviceSlugs=["software-development","web-development","mobile-development","ui-ux-design","backend-development","enterprise-solutions","saas-development","business-automation","ecommerce-development","software-testing","cybersecurity","artificial-intelligence","cloud-engineering","data-analytics","it-consulting","software-maintenance"];
export const productSlugs=["restaurant-erp","workforce-os","commerce","crm","shield","intelligence","desk","deploy","learn"];
export const approvedProducts=websiteContent.products.blocks.map((content,index)=>({slug:productSlugs[index],content:{...content,id:productSlugs[index]},href:`/products#${productSlugs[index]}`}));
const topic=(id:string,content:CompanyBlock)=>({...content,id});
const about={...websiteContent.about,blocks:[...(["identity","purpose","vision","mission","values","roadmap","partnerships","security","research","commitment"] as const).map(id=>topic(id,websiteContent[id])),topic("teams",websiteContent.teams),topic("global",websiteContent.global)]};
const services={...websiteContent.services,blocks:[...websiteContent.services.blocks.map((content,index)=>topic(serviceSlugs[index],content)),...(["expertise","technologies","industries","process","engineering","engagements"] as const).map(id=>topic(id,websiteContent[id]))]};
function page(content:CompanyBlock,category:string):PublicPage{return {category,title:content.title,description:content.paragraphs[0]??"",sections:[],content,accordion:true};}
export const companyPages:Record<string,PublicPage>={about:page(about,"Company"),services:page(services,"Services")};
