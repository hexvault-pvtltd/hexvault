import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export default function NavigationDropdown({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="hv-nav-dropdown">
      <summary>{label}<ChevronDown size={14} aria-hidden="true" /></summary>
      <div className="hv-dropdown-panel">{children}</div>
    </details>
  );
}
