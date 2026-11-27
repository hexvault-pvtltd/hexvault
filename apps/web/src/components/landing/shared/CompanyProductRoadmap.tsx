import CompanyContent from "./CompanyContent";
import { approvedProducts } from "./companyPages";
import { websiteContent } from "./websiteContent";

const normalized=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,"").replace(/^hexvault/,"");
export function approvedProductStatus(name:string){return approvedProducts.find(product=>normalized(product.content.title)===normalized(name))?.content.status;}
export function approvedProductAnchor(name:string){return approvedProducts.find(product=>normalized(product.content.title)===normalized(name))?.slug;}
export default function CompanyProductRoadmap({publishedNames=[]}:{publishedNames?:string[]}) {
  const published=new Set(publishedNames.map(normalized));
  const pending=approvedProducts.filter(product=>!published.has(normalized(product.content.title)));

  return <section className="cc-product-roadmap" aria-labelledby="product-roadmap-title"><p className="cc-eyebrow">Our product ecosystem</p><h2 id="product-roadmap-title">In development. In planning.</h2><CompanyContent content={{...websiteContent.products,blocks:pending.map(product=>product.content)}} collapsible/><details id="availability" className="cc-question"><summary>Product and service availability <span aria-hidden="true">+</span></summary>{websiteContent.availability.paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</details></section>;
}
