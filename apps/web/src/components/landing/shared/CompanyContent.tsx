import Link from "next/link";
import type { CompanyBlock } from "./websiteContent";
import "./company-content.css";

export function CompanyStatus({status}:{status?:string}) {
  return status?<span className="cc-status">{status}</span>:null;
}
function Copy({block,level=2}:{block:CompanyBlock;level?:number}) {
  return <><CompanyStatus status={block.status}/>{block.paragraphs.map((text,index)=><p key={index}>{text}</p>)}{block.items.length>0&&<ul>{block.items.map((text,index)=><li key={index}>{text}</li>)}</ul>}{block.blocks.map(child=><section key={child.title} className="cc-subsection">{level===2?<h3>{child.title}</h3>:<h4>{child.title}</h4>}<Copy block={child} level={level+1}/></section>)}</>;
}
export default function CompanyContent({content,skipFirstParagraph=false,cardLinks,faq=false}:{content:CompanyBlock;skipFirstParagraph?:boolean;cardLinks?:Record<string,string>;faq?:boolean}) {
  const introduction={...content,paragraphs:skipFirstParagraph?content.paragraphs.slice(1):content.paragraphs,blocks:[]};
  return <div className="cc-content"><div className="cc-introduction"><Copy block={introduction}/></div><div className={cardLinks?"cc-cards":"cc-sections"}>{content.blocks.map((block,index)=>faq?<details key={block.title} className="cc-question"><summary>{block.title}<span aria-hidden="true">+</span></summary><Copy block={block}/></details>:<section className={cardLinks?"cc-card":"cc-section"} key={block.title}>
    {!cardLinks&&<span className="cc-number" aria-hidden="true">{String(index+1).padStart(2,"0")}</span>}
    <div><h2>{block.title}</h2><Copy block={cardLinks?{...block,items:[],blocks:[]}:block}/>{cardLinks?.[block.title]&&<Link href={cardLinks[block.title]}>Explore details <span aria-hidden="true">↗</span></Link>}</div>
  </section>)}</div></div>;
}
