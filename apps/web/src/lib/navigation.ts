import { Activity, Bell, BriefcaseBusiness, Building2, CalendarDays, Cloud, ClipboardList, DatabaseBackup, FileText, LayoutDashboard, MessageCircle, HardDrive, Settings2, ShieldCheck, Users, WalletCards } from "lucide-react";

type IconComponent = typeof LayoutDashboard;
export type NavLink = readonly [label: string, href: string, icon: IconComponent];
export type NavSection = { title: string; links: NavLink[] };
export type NavGroup = { title: string; links: NavLink[]; icon?: IconComponent; sections?: NavSection[] };
const OWNER_HR = ["OWNER", "HR"];
const MANAGEMENT = ["OWNER", "HR", "DEPARTMENT_HEAD", "TEAM_LEAD"];

const navigation: NavGroup[] = [
  { title: "Overview", icon: LayoutDashboard, links: [["Dashboard", "/dashboard", LayoutDashboard], ["Notifications", "/notifications", Bell]] },
  { title: "Personal", icon: Users, links: [["My goals", "/my-goals", ClipboardList], ["My account", "/account", Users]] },
  { title: "Work & collaboration", icon: BriefcaseBusiness, links: [], sections: [
    { title: "Daily work", links: [["Chat", "/chat", MessageCircle], ["Tasks", "/tasks", ClipboardList], ["Work journal", "/work-logs/my-journal", FileText]] },
    { title: "Projects", links: [["All projects", "/projects", BriefcaseBusiness], ["Create project", "/projects/new", BriefcaseBusiness]] },
    { title: "Performance", links: [["Overview", "/performance", Activity], ["Goals", "/performance/goals", ClipboardList], ["Reviews", "/performance/reviews", FileText]] },
  ] },
  { title: "People & organization", icon: Users, links: [], sections: [
    { title: "Workforce", links: [["Employees", "/workforce", Users], ["Add employee", "/workforce/new", Users], ["Former members", "/former-members", Users]] },
    { title: "Company structure", links: [["Organization chart", "/organization-chart", Building2], ["Departments", "/departments", Building2], ["Teams", "/teams", Users]] },
  ] },
  { title: "HR & hiring", icon: FileText, links: [], sections: [
    { title: "Recruitment", links: [["Job postings", "/hr/jobs", BriefcaseBusiness]] },
    { title: "Employee lifecycle", links: [["Onboarding", "/hr/onboarding", BriefcaseBusiness], ["Offboarding", "/hr/offboarding", BriefcaseBusiness]] },
    { title: "Records", links: [["Employee documents", "/hr/documents", FileText]] },
  ] },
  { title: "Attendance & leave", icon: CalendarDays, links: [], sections: [
    { title: "Attendance", links: [["Attendance", "/attendance", CalendarDays], ["Corrections", "/attendance/corrections", CalendarDays]] },
    { title: "Scheduling", links: [["Shifts", "/shifts", CalendarDays], ["Shift assignments", "/shifts/assignments", CalendarDays], ["Holidays", "/holidays", CalendarDays]] },
    { title: "Leave", links: [["Leave requests", "/leave", WalletCards], ["Leave policies", "/leave/policies", WalletCards]] },
  ] },
  { title: "Website & data", icon: HardDrive, links: [], sections: [
    { title: "Website", links: [["Products", "/settings/products", BriefcaseBusiness]] },
    { title: "Files & storage", links: [["CDN files", "/cdn", Cloud], ["Storage optimization", "/settings/storage", HardDrive]] },
    { title: "Backup & recovery", links: [["Backups", "/backups", DatabaseBackup]] },
  ] },
  { title: "Security & settings", icon: ShieldCheck, links: [], sections: [
    { title: "Security", links: [["Audit log", "/security/audit-logs", Activity], ["Active sessions", "/security/sessions", ShieldCheck]] },
    { title: "Settings", links: [["Company settings", "/settings", Settings2], ["My account", "/account", Users]] },
  ] },
];

export function groupLinks(group: NavGroup): NavLink[] {
  return [...group.links, ...(group.sections ?? []).flatMap(section => section.links)];
}
const restrictedRoutes: Record<string, readonly string[]> = {
  "/workforce/new": OWNER_HR,
  "/projects/new": ["OWNER", "DEPARTMENT_HEAD"],
  "/former-members": MANAGEMENT,
  "/organization-chart": MANAGEMENT,
  "/departments": MANAGEMENT,
  "/teams": MANAGEMENT,
  "/hr/onboarding": MANAGEMENT,
  "/hr/offboarding": MANAGEMENT,
  "/shifts": OWNER_HR,
  "/shifts/assignments": OWNER_HR,
  "/holidays": OWNER_HR,
  "/leave/policies": OWNER_HR,
  "/hr/documents": OWNER_HR,
  "/hr/jobs": OWNER_HR,
  "/settings/storage": ["OWNER"],
  "/backups": ["OWNER"],
  "/security/audit-logs": ["OWNER"],
  "/settings": ["OWNER"],
  "/settings/products": ["OWNER"],
};
export function navigationForRoles(roles: readonly string[]): NavGroup[] {
  const owner = roles.includes("OWNER");
  const hr = roles.includes("HR");
  const management = roles.some(role => MANAGEMENT.includes(role));
  const allowed = (href: string) => !restrictedRoutes[href] || restrictedRoutes[href].some(role => roles.includes(role));
  const mapLinks = (links: NavLink[]): NavLink[] => links.filter(([, href]) => allowed(href)).map(([label, href, icon]): NavLink => {
    if (!owner && href === "/projects") label = management ? "Projects in scope" : "My projects";
    if (!management && href === "/workforce") label = "My employee record";
    if (!management && href === "/performance/goals") label = "My goals";
    if (!management && href === "/performance/reviews") label = "My reviews";
    if (!management && href === "/leave") label = "My leave";
    return [label, href, icon];
  });
  return navigation.map(group => ({ ...group,
    title: !owner && group.title === "Website & data" ? "Files"
      : !owner && group.title === "Security & settings" ? "My account"
      : !owner && !hr && group.title === "HR & hiring" ? "Employee lifecycle"
      : !management && group.title === "People & organization" ? "My records" : group.title,
    links: mapLinks(group.links),
    sections: group.sections?.map(section => ({ ...section,
      title: !owner && section.title === "Files & storage" ? "Shared files"
        : !owner && section.title === "Settings" ? "Profile"
        : !management && section.title === "Performance" ? "My performance"
        : !management && section.title === "Workforce" ? "Employee profile" : section.title,
      links: mapLinks(section.links),
    })).filter(section => section.links.length > 0),
  })).filter(group => groupLinks(group).length > 0);
}
