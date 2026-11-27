import type { PublicPage } from "./publicPages";
import { websiteContent, type CompanyBlock } from "./websiteContent";

export const serviceSlugs=["software-development","web-development","mobile-development","ui-ux-design","backend-development","enterprise-solutions","saas-development","business-automation","ecommerce-development","software-testing","cybersecurity","artificial-intelligence","cloud-engineering","data-analytics","it-consulting","software-maintenance"];
export const productSlugs=["restaurant-erp","workforce-os","commerce","crm","shield","intelligence","desk","deploy","learn"];
export const approvedProducts=websiteContent.products.blocks.map((content,index)=>({content,href:`/${productSlugs[index]}`}));

function page(content:CompanyBlock,category:string,related:PublicPage["related"]=[{label:"Contact us",href:"/contact"},{label:"Availability",href:"/availability"}]):PublicPage {
  return {category,title:content.title,description:content.paragraphs[0]??`Explore ${content.title.toLowerCase()} at HEXVAULT.`,sections:[],content,related};
}
export const companyPages:Record<string,PublicPage>={
  about:page(websiteContent.about,"Company",[{label:"Our identity",href:"/identity"},{label:"Our purpose",href:"/purpose"},{label:"Vision & mission",href:"/vision"},{label:"Our values",href:"/values"}]),
  identity:page(websiteContent.identity,"Company"),purpose:page(websiteContent.purpose,"Company"),vision:page(websiteContent.vision,"Company"),mission:page(websiteContent.mission,"Company"),values:page(websiteContent.values,"Company"),
  services:{...page(websiteContent.services,"Services"),cardLinks:Object.fromEntries(websiteContent.services.blocks.map((block,index)=>[block.title,`/${serviceSlugs[index]}`]))},
  expertise:page(websiteContent.expertise,"Capabilities"),technologies:page(websiteContent.technologies,"Capabilities"),industries:page(websiteContent.industries,"Industries"),research:page(websiteContent.research,"Research & development"),
  process:page(websiteContent.process,"How we work"),"engineering-principles":page(websiteContent.engineering,"How we work"),"why-hexvault":page(websiteContent.why,"Company"),"engagement-models":page(websiteContent.engagements,"Work with us"),
  "our-teams":page(websiteContent.teams,"Company"),partnerships:page(websiteContent.partnerships,"Work with us"),security:page(websiteContent.security,"Security & privacy"),resources:page(websiteContent.resources,"Resources"),roadmap:page(websiteContent.roadmap,"Company"),"global-services":page(websiteContent.global,"Company"),commitment:page(websiteContent.commitment,"Company"),
  faq:{...page(websiteContent.faq,"Frequently asked questions"),faq:true},availability:page(websiteContent.availability,"Product & service availability"),
};
websiteContent.services.blocks.forEach((content,index)=>{companyPages[serviceSlugs[index]]=page(content,"Services");});
approvedProducts.forEach(({content,href})=>{companyPages[href.slice(1)]=page(content,"Products",[{label:"All products",href:"/products"},{label:"Product enquiries",href:"/contact"},{label:"Availability",href:"/availability"}]);});
companyPages.devops=companyPages["cloud-engineering"];
companyPages["ai-automation"]=companyPages["artificial-intelligence"];
companyPages["product-engineering"]=companyPages["software-development"];
const resourceSlugs=["blog","documentation","developer-resources","guides","case-studies","research-publications","faq","product-updates"];
companyPages.resources.cardLinks=Object.fromEntries(websiteContent.resources.blocks.map((block,index)=>[block.title,`/${resourceSlugs[index]}`]));
companyPages.about.related?.push({label:"Our teams",href:"/our-teams"},{label:"Our roadmap",href:"/roadmap"},{label:"Our commitment",href:"/commitment"});
companyPages.services.related=[{label:"Our expertise",href:"/expertise"},{label:"Technologies",href:"/technologies"},{label:"Industries",href:"/industries"},{label:"Engagement models",href:"/engagement-models"}];
companyPages.process.related=[{label:"Engineering principles",href:"/engineering-principles"},{label:"Why HEXVAULT?",href:"/why-hexvault"}];
websiteContent.resources.blocks.forEach((block,index)=>{
  if(resourceSlugs[index]!=="faq")companyPages[resourceSlugs[index]]=page({...block,status:"Planned and Expanding"},"Resources");
});
