import CompanyContent from "./CompanyContent";
import { approvedProducts } from "./companyPages";
import { websiteContent } from "./websiteContent";

const normalized=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,"").replace(/^hexvault/,"");
export function approvedProductStatus(name:string){return approvedProducts.find(product=>normalized(product.content.title)===normalized(name))?.content.status;}
export default function CompanyProductRoadmap({publishedNames=[]}:{publishedNames?:string[]}) {
  const published=new Set(publishedNames.map(normalized));
  const pending=approvedProducts.filter(product=>!published.has(normalized(product.content.title)));
  if(!pending.length)return null;
  return <section className="cc-product-roadmap" aria-labelledby="product-roadmap-title"><p className="cc-eyebrow">Our product ecosystem</p><h2 id="product-roadmap-title">In development. In planning.</h2><CompanyContent content={{...websiteContent.products,blocks:pending.map(product=>product.content)}} cardLinks={Object.fromEntries(pending.map(product=>[product.content.title,product.href]))}/></section>;
}
