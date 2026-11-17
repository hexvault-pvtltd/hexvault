import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "HEXVAULT — People and work, together", description: "Bring your people, projects, and everyday operations together in one clear workforce workspace." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
