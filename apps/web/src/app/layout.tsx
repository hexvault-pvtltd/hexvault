import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "HEXVAULT | Multiplayer mode for AI development", description: "Collaborate, build, and scale AI-powered solutions together in real time." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
