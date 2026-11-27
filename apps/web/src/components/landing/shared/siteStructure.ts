export const mainNavigation=[{label:"Home",href:"/"},{label:"About",href:"/about"},{label:"Services",href:"/services"},{label:"Products",href:"/products"},{label:"Careers",href:"/careers"},{label:"Contact",href:"/contact"}];

// Existing bookmarks lead to the consolidated section instead of another page.
export const publicRedirects:Record<string,string>={};
for(const topic of ["identity","purpose","vision","mission","values","roadmap","partnerships","security","research","commitment"])publicRedirects[topic]=`/about#${topic}`;
publicRedirects["our-teams"]="/about#teams";
publicRedirects["why-hexvault"]="/about";
publicRedirects["global-services"]="/about#global";
for(const topic of ["software-development","web-development","mobile-development","ui-ux-design","backend-development","enterprise-solutions","saas-development","business-automation","ecommerce-development","software-testing","cybersecurity","artificial-intelligence","cloud-engineering","data-analytics","it-consulting","software-maintenance","expertise","technologies","industries"])publicRedirects[topic]=`/services#${topic}`;
Object.assign(publicRedirects,{devops:"/services#cloud-engineering","ai-automation":"/services#artificial-intelligence","product-engineering":"/services#software-development",process:"/services#process","engineering-principles":"/services#engineering",pricing:"/services#engagements","engagement-models":"/services#engagements",faq:"/#faq",availability:"/products#availability",cookies:"/privacy","data-processing":"/privacy","acceptable-use":"/terms",sla:"/terms"});
for(const topic of ["restaurant-erp","workforce-os","commerce","crm","shield","intelligence","desk","deploy","learn"])publicRedirects[topic]=`/products#${topic}`;
for(const topic of ["resources","documentation","guides","api-reference","status","case-studies","blog","community","signup","support","developer-resources","research-publications","product-updates","responsible-disclosure"])publicRedirects[topic]="/contact#project-inquiry";
export function publicDestination(href:string) {
  if(!href.startsWith("/")||href.includes("#")||href.includes("?"))return href;
  return publicRedirects[href.slice(1)]??href;
}
